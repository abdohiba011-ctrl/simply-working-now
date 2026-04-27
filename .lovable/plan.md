# Fix All Remaining Issues — QA Sweep Round 2

## Goal
Continue the QA pass started last round. Audit remaining flows that weren't fully exercised, hunt for runtime bugs, fix everything found.

## Scope

### 1. Auth (round 2 verification)
- Verify `Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` all wire to Supabase correctly
- Verify Google OAuth via `lovable.auth.signInWithOAuth` works on `motonita.ma` (production)
- Check `OAuthHashWatcher` properly clears hash + creates session
- Confirm `handle_new_user` trigger creates profile + renter wallet on signup
- Check session persistence + `onAuthStateChange` listener order

### 2. Renter flow (round 2 — full end-to-end)
- Search → bike detail → date picker → hold creation (`create_bike_hold` RPC)
- Hold expiry handling on `Checkout.tsx`
- YouCan Pay 10 MAD booking fee → `PaymentStatus` polling → `Confirmation`
- Booking creation via `promote_hold_to_booking` RPC
- Renter wallet credit via `credit_renter_wallet` RPC after successful payment
- Booking list + cancellation
- Chat unlock after booking + message audit triggers (phone/WhatsApp detection)

### 3. Agency flow (NEW this round)
- Agency signup → `handle_new_agency_role` trigger → trial subscription
- Bike listing CRUD (respecting plan limits: free=3, pro=unlimited)
- Wallet top-up via YouCan Pay
- Booking confirmation → `confirm_booking` RPC → 50 MAD wallet deduction
- Booking decline / reject flow
- Subscription downgrade via `request_plan_downgrade`
- Subscription lifecycle (trialing → past_due → locked) display

### 4. Admin / shared
- Verify RLS policies don't break legitimate writes (especially `bookings_protect_sensitive_fields`)
- TypeScript clean check (`tsc --noEmit`)
- Check edge function logs for recent errors
- Check auth logs for `failed to exchange authorization code` recurrence
- Scan all `console.error` / `TODO` / `FIXME` markers in `src/`
- Verify all routes in `App.tsx` resolve to existing pages
- Check i18n: no hardcoded user-facing strings introduced in last round's edits

## Approach

1. Run automated checks first (tsc, edge function logs, auth logs, code scan) — cheap signal.
2. Read the agency flow files (Dashboard, BikeForm, WalletTopup, BookingConfirm) for logic bugs.
3. Read renter checkout chain end-to-end for state-machine bugs.
4. For each bug found: fix in code, re-verify, move on.
5. Skip browser testing unless a bug is suspected but unconfirmed from code reading.

## Deliverable
- List of every issue found + how it was fixed
- Confirmation `tsc --noEmit` passes
- Summary of any issues that need user action (DNS, secrets, manual config)

## Out of scope
- New features
- Visual redesigns
- Performance optimization (unless it causes a bug)
- Anything touching the locked business model rules
