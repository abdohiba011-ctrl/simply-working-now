// Motonita daily backup function
// - Exports key tables + auth users (safe fields) to JSON
// - Uploads to private "motonita-backups" bucket
// - Tracks each run in backup_runs
// - Enforces 30-day retention
// - Sends admin email on success/failure
//
// Triggers:
//   * Scheduled via pg_cron (daily 03:00 Africa/Casablanca = 02:00 UTC)
//   * Manual: POST with admin JWT, body { backup_type: "manual" }
//
// IMPORTANT: verify_jwt is OFF (cron uses service role). Admin check is in-code.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TABLES = [
  'profiles',
  'user_roles',
  'admin_employees',
  'agencies',
  'agency_documents',
  'bike_types',
  'bikes',
  'bike_type_images',
  'bike_inventory',
  'bookings',
  'booking_payments',
  'youcanpay_payments',
  'service_cities',
  'service_locations',
  'audit_logs',
  'notifications',
  'messages',
]

const BUCKET = 'motonita-backups'
const RETENTION = 30
const ADMIN_NOTIFY_EMAIL = Deno.env.get('BACKUP_ADMIN_EMAIL') || 'admin@motonita.ma'

async function exportTable(supabase: any, table: string) {
  const all: any[] = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1)
    if (error) {
      // Table missing or no permissions — return null marker
      return { rows: null, count: 0, error: error.message }
    }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return { rows: all, count: all.length, error: null as string | null }
}

async function listAuthUsers(supabase: any) {
  const safe: any[] = []
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) return { users: safe, error: error.message }
    const batch = data?.users || []
    for (const u of batch) {
      safe.push({
        id: u.id,
        email: u.email ?? null,
        phone: u.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        provider: u.app_metadata?.provider ?? null,
        providers: u.app_metadata?.providers ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
      })
    }
    if (batch.length < perPage) break
    page += 1
    if (page > 100) break // safety
  }
  return { users: safe, error: null as string | null }
}

async function listSecretNames(): Promise<string[]> {
  // We can't enumerate platform secrets at runtime. We list known/expected names
  // (values are NEVER read or exported).
  return [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_DB_URL',
    'LOVABLE_API_KEY',
    'RESEND_API_KEY',
    'YOUCANPAY_PRIVATE_KEY',
    'YOUCANPAY_PUBLIC_KEY',
    'BACKUP_ADMIN_EMAIL',
  ].filter((n) => Deno.env.get(n) !== undefined)
}

async function sendAdminEmail(supabase: any, subject: string, bodyHtml: string) {
  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'admin-message',
        recipientEmail: ADMIN_NOTIFY_EMAIL,
        templateData: {
          subject,
          title: subject,
          message: bodyHtml,
        },
      },
    })
  } catch (e) {
    console.error('Admin email failed:', e)
  }
}

async function enforceRetention(supabase: any) {
  // List files under daily/ and manual/ and delete older than 30 newest per type
  const removed: string[] = []
  for (const prefix of ['daily', 'manual']) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
    if (error || !data) continue
    const old = data.slice(RETENTION)
    if (old.length > 0) {
      const paths = old.map((f: any) => `${prefix}/${f.name}`)
      await supabase.storage.from(BUCKET).remove(paths)
      removed.push(...paths)
    }
  }
  return removed
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Determine trigger type + admin gating for manual
  let backupType: 'daily' | 'manual' = 'daily'
  let createdBy: string | null = null

  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (body?.backup_type === 'manual') {
        backupType = 'manual'
        // Verify caller is admin via JWT
        const authHeader = req.headers.get('Authorization') || ''
        const token = authHeader.replace('Bearer ', '')
        if (!token) {
          return new Response(JSON.stringify({ error: 'Auth required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: u } = await userClient.auth.getUser()
        if (!u?.user) {
          return new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        createdBy = u.user.id
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: u.user.id,
          _role: 'admin',
        })
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Admin only' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }
  } catch (_e) {
    // ignore body parse errors; treat as daily
  }

  // Create run row
  const { data: runRow, error: runErr } = await supabase
    .from('backup_runs')
    .insert({ status: 'running', backup_type: backupType, created_by: createdBy })
    .select()
    .single()

  if (runErr) {
    return new Response(JSON.stringify({ error: 'Could not create run', detail: runErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const runId = runRow.id
  const startedAt = new Date()
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-')
  const folder = `${backupType}/${stamp}`

  const tableResults: Record<string, { count: number; path: string; error: string | null }> = {}
  const errors: string[] = []
  let totalBytes = 0

  try {
    // Tables
    for (const t of TABLES) {
      const res = await exportTable(supabase, t)
      if (res.error) {
        errors.push(`${t}: ${res.error}`)
        tableResults[t] = { count: 0, path: '', error: res.error }
        continue
      }
      const json = JSON.stringify(res.rows, null, 0)
      const path = `${folder}/tables/${t}.json`
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([json], { type: 'application/json' }), { upsert: true })
      if (upErr) {
        errors.push(`upload ${t}: ${upErr.message}`)
        tableResults[t] = { count: res.count, path: '', error: upErr.message }
      } else {
        totalBytes += json.length
        tableResults[t] = { count: res.count, path, error: null }
      }
    }

    // Auth users (safe fields only)
    const auth = await listAuthUsers(supabase)
    const authJson = JSON.stringify(auth.users, null, 0)
    const authPath = `${folder}/auth/users.json`
    await supabase.storage
      .from(BUCKET)
      .upload(authPath, new Blob([authJson], { type: 'application/json' }), { upsert: true })
    totalBytes += authJson.length
    if (auth.error) errors.push(`auth: ${auth.error}`)

    // Secrets inventory (names only)
    const secretNames = await listSecretNames()
    const secretsPath = `${folder}/secrets/inventory.json`
    const secretsJson = JSON.stringify(
      { exported_at: new Date().toISOString(), names: secretNames, note: 'NAMES ONLY — values are never exported.' },
      null,
      2,
    )
    await supabase.storage
      .from(BUCKET)
      .upload(secretsPath, new Blob([secretsJson], { type: 'application/json' }), { upsert: true })
    totalBytes += secretsJson.length

    // Migration count (best effort)
    let migrationCount: number | null = null
    try {
      const { count } = await supabase
        .schema('supabase_migrations' as any)
        .from('schema_migrations')
        .select('*', { count: 'exact', head: true })
      migrationCount = count ?? null
    } catch {
      migrationCount = null
    }

    // Edge functions list (static — known set)
    const edgeFunctions = [
      'auth-email-hook', 'check-account-method', 'generate-receipt', 'generate-sitemap',
      'handle-email-suppression', 'handle-email-unsubscribe', 'preview-transactional-email',
      'process-email-queue', 'send-transactional-email', 'youcanpay-create-token',
      'youcanpay-verify-payment', 'youcanpay-webhook', 'motonita-backup-daily',
    ]

    const status = errors.length === 0 ? 'success' : (Object.values(tableResults).some(r => r.path) ? 'success' : 'failed')

    // Manifest
    const manifest = {
      backup_id: runId,
      backup_date: startedAt.toISOString(),
      project_ref: 'impgemzhqvbxitsxxczm',
      backup_type: backupType,
      status,
      folder,
      tables: tableResults,
      auth_users_count: auth.users.length,
      auth_users_path: authPath,
      secrets_inventory_path: secretsPath,
      secret_names_count: secretNames.length,
      edge_functions: edgeFunctions,
      migration_count: migrationCount,
      total_bytes: totalBytes,
      errors,
    }
    const manifestPath = `${folder}/manifest.json`
    const manifestJson = JSON.stringify(manifest, null, 2)
    await supabase.storage
      .from(BUCKET)
      .upload(manifestPath, new Blob([manifestJson], { type: 'application/json' }), { upsert: true })
    totalBytes += manifestJson.length

    // Retention
    const removed = await enforceRetention(supabase)

    // Update run row
    await supabase
      .from('backup_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        file_path: manifestPath,
        file_size: totalBytes,
        error_message: errors.length ? errors.join(' | ').slice(0, 2000) : null,
        manifest,
      })
      .eq('id', runId)

    // Email notification
    const subj = status === 'success' ? 'Motonita backup completed' : 'Motonita backup failed'
    const html = `
      <p><strong>${subj}</strong></p>
      <ul>
        <li>Run ID: ${runId}</li>
        <li>Type: ${backupType}</li>
        <li>Folder: ${folder}</li>
        <li>Tables OK: ${Object.values(tableResults).filter(r => r.path).length}/${TABLES.length}</li>
        <li>Auth users: ${auth.users.length}</li>
        <li>Total size: ${(totalBytes / 1024).toFixed(1)} KB</li>
        <li>Removed (retention): ${removed.length}</li>
        ${errors.length ? `<li>Errors: ${errors.slice(0, 5).join('; ')}</li>` : ''}
      </ul>
    `
    await sendAdminEmail(supabase, subj, html)

    return new Response(JSON.stringify({ ok: true, run_id: runId, status, manifest_path: manifestPath, removed_old: removed.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    const msg = e?.message || String(e)
    await supabase.from('backup_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: msg.slice(0, 2000),
    }).eq('id', runId)
    await sendAdminEmail(supabase, 'Motonita backup failed', `<p>Run ${runId} failed: ${msg}</p>`)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
