## What you're seeing & why

Three separate issues — let me address each honestly because one of them needs a product decision from you before I touch code.

---

### Issue 1 — Credits pill shows on `/affiliate` even though page says "Credits are for renters"

**Cause:** You signed up as a renter, so the header correctly shows the credits pill (0 MAD). The `/affiliate` page body has a separate "Credits are for renters" empty state that's targeted at *agency-only* users — but you're a renter, so you shouldn't see that empty state at all. You should see the actual referral/affiliate UI.

**Fix:** In `src/pages/Affiliate.tsx`, the gating logic is wrong. Renters should see the full affiliate page; only agency-only (no renter role) users should see the "Credits are for renters" lock screen.

---

### Issue 2 — `/agencies` CTAs ("Start 30-day free trial", "Log in to dashboard") send a logged-in renter to the wrong place

**Cause:** Both buttons in `src/pages/Agencies.tsx` link unconditionally to `/agency/signup` and `/agency/login`. When a renter is already logged in, `/agency/login` redirects them via `navigateAfterAuth` which sees they have no agency role and bounces them around.

**Fix:** Make the CTAs role-aware on `/agencies`:
- Not logged in → `/agency/signup` and `/agency/login` (current).
- Logged in as renter (no agency role) → both CTAs go to `/agency/signup` (because they need to *create* an agency account, not log in again).
- Logged in as agency → both CTAs go to `/agency/dashboard`.

Apply the same fix to the bottom "Ready to grow your rental business?" CTAs and the pricing-card CTAs.

---

### Issue 3 — "Same email can't be reused for renter AND agency" — needs your decision

This is the big one. Right now the app uses a single Supabase `auth.users` table where **email is globally unique**. One email = one account = one set of roles attached to it. That's why signing up as agency with your renter email throws "email already exists".

You're asking for the opposite: two parallel namespaces, where `you@gmail.com` can exist independently as a renter account AND as a separate agency account, with different passwords, different verification, different everything.

**There are only two clean ways to do this — they have very different consequences. Pick one:**

#### Option A — One account, multiple roles (RECOMMENDED — small change)
`you@gmail.com` is one account. When a renter tries to sign up as agency with the same email, instead of erroring we say:
> "You already have a renter account. Add an agency profile to it?"
> [Sign in to add agency role]

After they sign in, we run the agency onboarding wizard (business name, city, etc.), insert the `agency` role into `user_roles`, and they can switch between renter and agency from their avatar menu. One password, one inbox, two dashboards.

This matches the codebase's existing role-switcher (`switchRoleStore`, `MockProtectedRoute` already handles dual-role users) and the `MockUser` shape that already has both `roles.renter` and `roles.agency`. **~1 day of work.**

#### Option B — True separate accounts per role (BIG REWRITE)
`you@gmail.com` literally exists twice in `auth.users` — once as renter, once as agency. Different passwords. Different sessions. They can't share data, can't switch in-app, must log out and log back in to swap.

Supabase enforces unique emails on `auth.users` natively. To do this we'd have to:
- Store agency accounts under a synthetic email (e.g. `agency+you@gmail.com`) so Supabase accepts them, then map back to the real email in our own table — fragile and breaks password reset, OAuth, email verification.
- OR run two Supabase projects (one for renters, one for agencies) — operationally painful and we'd lose the unified admin panel.

**This is ~1–2 weeks of work, will break OAuth/Google sign-in, and creates ongoing support pain (users will forget which "version" of their account they're on).** I strongly recommend against it.

---

## What I'll build (assuming Option A)

1. **Affiliate page gating fix** — show the affiliate UI to renters; show the "Credits are for renters" lock only to agency-only users.

2. **Agencies page CTAs become role-aware** — hero buttons, pricing-plan CTAs, and the bottom "Ready to grow" section all check auth state + roles and route correctly. Logged-in renter → `/agency/signup` (which becomes "add agency profile"). Logged-in agency → `/agency/dashboard`.

3. **Add-role flow for existing accounts** — when a logged-in renter hits `/agency/signup`, skip the email/password step entirely and show only step 2 (business name, type, city, neighborhood). On submit:
   - Insert `agency` row into `user_roles` (via a new `add_role_to_self` RPC — needed because the `guard_user_roles_write` trigger blocks direct inserts from authenticated users).
   - Update `profiles` with business fields + `user_type = 'business'`.
   - Switch active role to `agency` and route to `/agency/dashboard` (or `/agency/verification`).

4. **Better error message in renter signup → agency signup case** — when someone tries to sign up as agency with an email that already has a renter account, instead of the generic "email already exists" red box, show:
   > "This email already has a renter account. [Log in] to add an agency profile to it."

5. **QA pass** — verify all four matrix cases:
   - Anonymous → /agencies CTAs → signup/login pages
   - Renter logged in → /agencies CTAs → "add agency profile" wizard
   - Agency logged in → /agencies CTAs → /agency/dashboard
   - Dual-role user → /agencies CTAs → /agency/dashboard

## Technical details

- `src/pages/Affiliate.tsx`: change gate from `isRenter ? lock : page` to `isAgencyOnly ? lock : page`.
- `src/pages/Agencies.tsx`: replace each `<Link to="/agency/...">` wrapper with a function that branches on `useAuthStore` state + `user.roles`.
- `src/pages/auth/Signup.tsx` (agency flow): when `isAuthenticated && user.roles.renter.active && !user.roles.agency.active`, render only Step 2 and call a new `addAgencyRole()` action on submit instead of `signup()`.
- `src/stores/useAuthStore.ts`: add `addAgencyRole(extra: AgencyExtraData)` that calls a new SECURITY DEFINER RPC.
- New migration: `add_role_to_self(_role app_role, _profile jsonb)` — SECURITY DEFINER function that inserts into `user_roles` for `auth.uid()`, updates `profiles`, returns void. Bypasses the existing `guard_user_roles_write` trigger because it runs as the function owner.
- No changes to `auth.users`, no synthetic emails, no second Supabase project.

## Out of scope (per your "fix only what I asked" constraint)
- Header avatar dropdown contents (already changed last loop).
- Admin panel access (already covered by `mem://navigation/admin-access`).
- Verification upload UI (already shipped).