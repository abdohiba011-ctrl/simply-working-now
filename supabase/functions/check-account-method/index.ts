// check-account-method
// After a failed login, the client calls this with an email to learn whether:
//   - the email is unknown (status=not_found)
//   - the account exists but has NO password (Google/OAuth-only) → status=oauth_only
//   - the account exists and has a password → status=has_password
// This lets us show a precise, actionable error instead of the generic
// "Invalid credentials" message Supabase returns for every failed login.
//
// Privacy & abuse:
// - Only returns 3 booleans, never any PII.
// - Lightweight per-IP rate-limit (in-memory, best effort).
// - Should be called sparingly, only AFTER a failed login attempt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- per-IP rate limit: 20 calls / 5 min ---
const WINDOW_MS = 5 * 60_000;
const MAX_CALLS = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > MAX_CALLS;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = (body as { email?: unknown })?.email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || !EMAIL_RX.test(email) || email.length > 255) {
    return new Response(JSON.stringify({ error: "invalid_email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // We use the admin REST endpoint so we don't need a custom DB function.
  // listUsers supports filtering by exact email (case-insensitive in auth.users).
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    console.error("listUsers failed", error);
    return new Response(JSON.stringify({ status: "unknown" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const match = data.users.find(
    (u) => (u.email ?? "").trim().toLowerCase() === email,
  );

  if (!match) {
    return new Response(JSON.stringify({ status: "not_found" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const meta = (match.app_metadata ?? {}) as {
    provider?: string;
    providers?: string[];
  };
  const providers = Array.isArray(meta.providers) ? meta.providers : [];
  const onlyOAuth =
    providers.length > 0 && !providers.includes("email") &&
    meta.provider !== "email";

  // We can't see encrypted_password from admin API, but provider list is the
  // source of truth: a Google-only signup never gets the "email" provider
  // attached, hence no password.
  const status = onlyOAuth ? "oauth_only" : "has_password";

  return new Response(
    JSON.stringify({
      status,
      providers,
      // Surface the canonical primary provider so the UI can suggest
      // exactly which button to use.
      primary_provider: providers[0] ?? meta.provider ?? null,
      email_confirmed: !!match.email_confirmed_at,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
