## Part 1 — Admin Panel front-end verification

The front-end code is already correct:

- `src/components/auth/UserMenu.tsx` (lines 128–136) renders the **Admin Panel** dropdown item whenever `user.isAdmin === true`.
- `src/stores/useAuthStore.ts` (line 154) computes `isAdmin` from the `user_roles` table: `isAdmin: roles.includes("admin")`.
- The DB confirms `abdrahimbamouh56@gmail.com` has the `admin` role.

So the UI logic is wired correctly. To make the verification airtight from the UI side, I will:

1. Add a temporary `console.log` (auto-removed after confirm) in `useAuthStore.ts` after `loadAuthUserModel` runs that logs `{ email, isAdmin, roles }` so you can open DevTools and confirm exactly what the front-end sees for your account.
2. Add a small `data-admin="true|false"` attribute to the `UserMenu` trigger so we can visually confirm in DOM whether the user is being treated as admin even before opening the dropdown.
3. If `isAdmin` is `true` in the log but the menu item still doesn't show, I'll know it's a render/cache issue and force a re-fetch of `user_roles` on session restore.
4. If `isAdmin` is `false` in the log, the issue is the session is stale → I'll add a "Refresh permissions" action that re-runs `loadAuthUserModel` without forcing a logout.

This gives us a concrete answer in one round-trip instead of guessing.

## Part 2 — Route ALL auth emails through Resend

### Current state
- ✅ Transactional emails (booking notifications, admin notifications) already go through Resend via the connector gateway (`send-transactional-email` edge function).
- ❌ Auth emails (signup confirmation OTP, password reset OTP, magic link, email change) are still sent by default Supabase/Lovable mailer because the previous step deleted `auth-email-hook`.

### What I'll do

1. **Re-create the `auth-email-hook` edge function** — but this time it will send through the Resend connector (not Lovable's mailer). It will:
   - Receive Supabase Auth's webhook payload for every auth email (signup, recovery, magic link, email change, reauthentication).
   - Verify the webhook signature using `SEND_EMAIL_HOOK_SECRET`.
   - Render the right React Email template (signup, recovery, magic-link, email-change, reauthentication, invite — already exist in `supabase/functions/_shared/email-templates/`).
   - POST to `https://connector-gateway.lovable.dev/resend/emails` with `From: Motonita.ma <noreply@motonita.ma>`, the rendered HTML, and the 6-digit token / confirmation link.
   - Log success/failure to `email_send_log` for visibility.

2. **Register the hook in Supabase Auth** via a migration:
   - Set the `Send Email` auth hook URL to the deployed `auth-email-hook` function.
   - Generate `SEND_EMAIL_HOOK_SECRET` and store it as a Supabase secret.
   - Set `verify_jwt = false` for `auth-email-hook` in `supabase/config.toml`.

3. **Update the auth email templates** to use the Motonita branding (lime `#9FE870`, deep forest `#163300`, Inter font) and to clearly show the **6-digit OTP code** for:
   - Signup confirmation (`signup.tsx`)
   - Password reset (`recovery.tsx`)
   - Magic link (`magic-link.tsx`)
   - Email change (`email-change.tsx`)
   - Reauthentication (`reauthentication.tsx`)
   - Invite (`invite.tsx`)

4. **Deploy the function** and confirm with a real test (you trigger "Forgot password" → you receive a Resend-sent email from `noreply@motonita.ma` with a 6-digit code).

### Result
Every email your users receive — signup OTP, password reset OTP, magic link, email change confirmation, booking notifications, admin notifications — will be sent by Resend from `noreply@motonita.ma`. Lovable Emails / `notify.motonita.ma` will not be used for anything.

### Files that will change
- `supabase/functions/auth-email-hook/index.ts` (new)
- `supabase/functions/auth-email-hook/deno.json` (new)
- `supabase/config.toml` (add `verify_jwt = false` for the hook)
- `supabase/functions/_shared/email-templates/*.tsx` (Motonita branding pass)
- New migration to register the auth hook URL with Supabase Auth
- Tiny diagnostic addition in `src/stores/useAuthStore.ts` + `src/components/auth/UserMenu.tsx` for Part 1

### What I need from you (after approval)
- Confirm you want the diagnostic logs added in Part 1 (I'll remove them once we confirm what the UI sees).
- The Resend API key is already stored as `RESEND_API_KEY` secret — no new key needed.
- The hook secret `SEND_EMAIL_HOOK_SECRET` will be auto-generated and added during the migration.
