import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

// ============================================================================
// Motonita transactional email sender — powered by Resend (via Lovable connector gateway)
// ----------------------------------------------------------------------------
// Sender:  "Motonita.ma <noreply@motonita.ma>"
// Provider: Resend  (DNS records added in Hostinger, domain verified in Resend)
// ============================================================================

const SITE_NAME = 'Motonita.ma'
const FROM_EMAIL = 'noreply@motonita.ma'
const FROM_HEADER = `${SITE_NAME} <${FROM_EMAIL}>`

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  if (!lovableApiKey || !resendApiKey) {
    return new Response(
      JSON.stringify({ error: 'Resend connector is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Parse request
  let templateName: string
  let recipientEmail: string
  let messageId: string
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!templateName) {
    return new Response(JSON.stringify({ error: 'templateName is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({ error: 'recipientEmail is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Suppression check (best-effort: if table missing, just continue)
  try {
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', effectiveRecipient.toLowerCase())
      .maybeSingle()
    if (suppressed) {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'suppressed',
      }).then(() => {}, () => {})
      return new Response(
        JSON.stringify({ success: false, reason: 'email_suppressed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  } catch (_) { /* table optional — keep sending */ }

  // Render template
  const html = await renderAsync(React.createElement(template.component, templateData))
  const plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true },
  )
  const resolvedSubject =
    typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  // Send via Resend (through Lovable connector gateway)
  try {
    const resp = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': resendApiKey,
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: [effectiveRecipient],
        subject: resolvedSubject,
        html,
        text: plainText,
      }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      console.error('Resend send failed', { status: resp.status, data })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: `Resend ${resp.status}: ${JSON.stringify(data)}`,
      }).then(() => {}, () => {})
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'sent',
    }).then(() => {}, () => {})

    console.log('Transactional email sent via Resend', { templateName, effectiveRecipient, id: data?.id })
    return new Response(
      JSON.stringify({ success: true, provider: 'resend', id: data?.id ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Unexpected error sending email', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
