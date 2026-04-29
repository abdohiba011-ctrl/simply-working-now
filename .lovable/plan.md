# Fix everything found so far, then keep testing

You said "YES FIX ALL" — here is exactly what I'll do, in order. After approval I switch to build mode and execute.

## Phase 1 — Fix the bugs already found

### 1. Add Google sign-in to Login + Signup (renter & agency)
The backend is already wired (`src/integrations/lovable/index.ts`, `OAuthHashWatcher`, `check-account-method` knows about OAuth-only accounts). Only the UI button is missing.

- Add a "Continue with Google" button above the email field on:
  - `src/pages/auth/Login.tsx` (used by renter `/login` and agency `/agency/login`)
  - `src/pages/auth/Signup.tsx` (used by renter `/signup` and agency `/agency/signup`)
- Use `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Add an "or" divider between the Google button and the email form
- Style: white button, Google "G" icon, rounded-md, full width — matches existing brand

### 2. Fix the React 18 "Function components cannot be given refs" warning
Two distinct sources confirmed in the latest console logs:

- **Source A: `TopCitiesSection`** — the `<TooltipTrigger asChild>` wrapping at line 156-169 makes Radix forward a ref to its child. The `<div>` child accepts refs, but the warning chain points at lazy-mounted children. Fix: remove the redundant `<TooltipProvider>` wrapper inside the loop and hoist a single one to the top of the section (reduces re-mount churn that triggers the warning), and ensure `<Badge>` is not wrapped in a non-ref-forwarding fragment.
- **Source B: `Help` lazy-loaded inside `SettingsHub`** — wrap `Help` with `React.forwardRef` (it currently does not accept a ref but `Suspense`/lazy expects forwardable components in some Radix integrations). Same for any other lazy children of `SettingsHub`.

Verify in the live preview after the fix that the warning no longer fires on `/` and `/agency/settings`.

### 3. Consolidate the two parallel auth systems (defer if it grows scope)
There are two stores: `AuthContext` (real Supabase) and `useAuthStore` (mock). `Login.tsx` uses the mock. This is technical debt, not a user-visible bug. **I will NOT touch this** unless I find a concrete bug caused by it during Phase 2 — refactoring it risks breaking working flows.

## Phase 2 — Continue critical-path QA after fixes

Walk through the rest of the platform end-to-end with the admin account, fix every real bug found:

1. **Renter booking flow** — `/listings` → bike details → `/checkout` (10 MAD YouCan Pay) → confirmation → `/inbox` chat unlock
2. **Agency dashboard** — `/agency/dashboard`, `/agency/motorbikes`, `/agency/bookings` (confirm a booking → 50 MAD wallet deduction), `/agency/finance`, `/agency/wallet`
3. **Admin panel** — `/admin/panel`, `/admin/clients`, `/admin/bookings`, `/admin/verifications`, `/admin/agencies/verifications`, `/admin/bikes/approvals`

For each: capture console errors, failed network requests, RLS denials, blank pages, broken interactions. Fix every P0/P1 (crashes, broken logic, security issues). Skip cosmetic P2 unless trivial.

## What I will NOT do

- Touch `src/integrations/supabase/client.ts`, `types.ts`, `.env`, or `supabase/config.toml` project-level settings (auto-generated).
- Add new database migrations unless a real bug requires it.
- Add features the user did not ask for.
- Spend the session on the React ref warning if it proves intractable — I'll log it as a known dev-only annoyance and move on.

## Risk

This is a long session. If we run low on credits before finishing Phase 2, I'll stop after Phase 1 + the renter booking flow (the highest-impact path) and report what's left untested. You can resume in a follow-up message.
