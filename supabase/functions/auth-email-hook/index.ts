import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

const SITE_NAME = 'Motonita'
const FROM_ADDRESS = `Motonita <noreply@support.motonita.ma>`
const ROOT_DOMAIN = 'motonita.ma'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Resend via connector gateway
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing')
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing')

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': RESEND_API_KEY,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html, text }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Resend send failed [${res.status}]: ${JSON.stringify(data)}`)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
    if (!hookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payloadRaw = await req.text()
    const headers = Object.fromEntries(req.headers)

    // Supabase Auth signs hook with standardwebhooks. Secret format: v1,whsec_xxx
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''))
    let event: any
    try {
      event = wh.verify(payloadRaw, headers)
    } catch (err) {
      console.error('Invalid webhook signature', err)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user, email_data } = event
    const emailType = email_data.email_action_type as string
    const recipient = user.email as string

    const Template = EMAIL_TEMPLATES[emailType]
    if (!Template) {
      console.error('Unknown email type', emailType)
      return new Response(JSON.stringify({ error: `Unknown type: ${emailType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const confirmationUrl =
      `${email_data.site_url}/auth/v1/verify?token=${email_data.token_hash}` +
      `&type=${emailType}&redirect_to=${encodeURIComponent(email_data.redirect_to || `https://${ROOT_DOMAIN}`)}`

    const props = {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient,
      confirmationUrl,
      token: email_data.token,
      email: recipient,
      newEmail: email_data.new_email,
    }

    const html = await renderAsync(React.createElement(Template, props))
    const text = await renderAsync(React.createElement(Template, props), { plainText: true })
    const subject = EMAIL_SUBJECTS[emailType] || 'Notification'

    await sendViaResend(recipient, subject, html, text)
    console.log('Auth email sent via Resend', { emailType, recipient })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('auth-email-hook error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
