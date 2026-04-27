/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'npm:standardwebhooks@1.0.0'

import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

// ============================================================================
// Motonita auth email hook — every Supabase Auth email goes through Resend.
// ----------------------------------------------------------------------------
// Sender:   "Motonita.ma <noreply@motonita.ma>"
// Provider: Resend (via Lovable connector gateway)
// Hook URL: https://impgemzhqvbxitsxxczm.functions.supabase.co/auth-email-hook
// Secret:   SEND_EMAIL_HOOK_SECRET (Supabase auth -> Send Email hook)
// ============================================================================

const SITE_NAME = 'Motonita.ma'
const SITE_URL = 'https://motonita.ma'
const FROM_EMAIL = 'noreply@motonita.ma'
const FROM_HEADER = `${SITE_NAME} <${FROM_EMAIL}>`

const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

interface EmailDataPayload {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type:
    | 'signup'
    | 'recovery'
    | 'magiclink'
    | 'invite'
    | 'email_change'
    | 'email_change_new'
    | 'reauthentication'
  site_url: string
  token_new?: string
  token_hash_new?: string
}

interface AuthHookPayload {
  user: {
    id: string
    email: string
    new_email?: string
  }
  email_data: EmailDataPayload
}

function buildConfirmationUrl(emailData: EmailDataPayload): string {
  const base = emailData.site_url || SITE_URL
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to || base,
  })
  return `${base.replace(/\/$/, '')}/auth/v1/verify?${params.toString()}`
}

function selectTemplate(payload: AuthHookPayload): {
  subject: string
  element: React.ReactElement
} {
  const { user, email_data } = payload
  const recipient = user.email
  const newEmail = user.new_email ?? recipient

  switch (email_data.email_action_type) {
    case 'signup':
      return {
        subject: `Your ${SITE_NAME} confirmation code`,
        element: React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient,
          token: email_data.token,
        }),
      }
    case 'recovery':
      return {
        subject: `Your ${SITE_NAME} password reset code`,
        element: React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          token: email_data.token,
        }),
      }
    case 'magiclink':
      return {
        subject: `Your ${SITE_NAME} login code`,
        element: React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          token: email_data.token,
        }),
      }
    case 'invite':
      return {
        subject: `You've been invited to ${SITE_NAME}`,
        element: React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: buildConfirmationUrl(email_data),
        }),
      }
    case 'email_change':
    case 'email_change_new':
      return {
        subject: `Confirm your new ${SITE_NAME} email`,
        element: React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          email: recipient,
          newEmail,
          confirmationUrl: buildConfirmationUrl(email_data),
        }),
      }
    case 'reauthentication':
      return {
        subject: `Your ${SITE_NAME} verification code`,
        element: React.createElement(ReauthenticationEmail, {
          token: email_data.token,
        }),
      }
    default:
      // Fallback: treat as a generic OTP / magic link
      return {
        subject: `Your ${SITE_NAME} code`,
        element: React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          token: email_data.token,
        }),
      }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')

  if (!lovableApiKey || !resendApiKey) {
    console.error('auth-email-hook: Resend connector not configured')
    return new Response(
      JSON.stringify({ error: 'Resend connector is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const rawBody = await req.text()

  // Verify webhook signature (Supabase Auth uses standard webhooks).
  // If no secret is configured we still allow the request through so the user
  // can wire things up — but we log a loud warning.
  let payload: AuthHookPayload
  try {
    if (hookSecret) {
      const headers = Object.fromEntries(req.headers)
      // Supabase prefixes the secret with "v1,whsec_..." — strip if present.
      const normalizedSecret = hookSecret.startsWith('v1,whsec_')
        ? hookSecret.slice(9)
        : hookSecret.startsWith('whsec_')
          ? hookSecret.slice(6)
          : hookSecret
      const wh = new Webhook(normalizedSecret)
      payload = wh.verify(rawBody, headers) as AuthHookPayload
    } else {
      console.warn('auth-email-hook: SEND_EMAIL_HOOK_SECRET not set — skipping signature verification')
      payload = JSON.parse(rawBody) as AuthHookPayload
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    console.error('auth-email-hook: signature verification failed', msg)
    return new Response(
      JSON.stringify({ error: `Invalid signature: ${msg}` }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (!payload?.user?.email || !payload?.email_data?.email_action_type) {
    return new Response(
      JSON.stringify({ error: 'Invalid auth hook payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const recipient = payload.user.email
  const { subject, element } = selectTemplate(payload)

  let html: string
  let plainText: string
  try {
    html = await renderAsync(element)
    plainText = await renderAsync(element, { plainText: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Render failed'
    console.error('auth-email-hook: render failed', msg)
    return new Response(
      JSON.stringify({ error: `Render failed: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Send via Resend (through Lovable connector gateway).
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
        to: [recipient],
        subject,
        html,
        text: plainText,
      }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      console.error('auth-email-hook: Resend send failed', {
        status: resp.status,
        action: payload.email_data.email_action_type,
        recipient,
        data,
      })
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log('auth-email-hook: sent via Resend', {
      action: payload.email_data.email_action_type,
      recipient,
      id: data?.id ?? null,
    })

    return new Response(
      JSON.stringify({ success: true, provider: 'resend', id: data?.id ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('auth-email-hook: unexpected error', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
