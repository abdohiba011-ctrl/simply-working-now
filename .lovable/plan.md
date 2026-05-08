## Three fixes

### 1. Phone number required for renters at signup

**Where:** `src/pages/auth/Signup.tsx` lines 124, 155-167 — current schema only requires phone for `agency`. Extend the same `superRefine` so phone is also required when `role === "renter"`.

Optional companion: `src/components/auth/AuthModal.tsx` line 414 — change label from `Phone (optional)` to `Phone` and require it before submit (the modal is the unified signup entry point).

i18n: keep current `mockAuth.phone` label; reuse the existing "Phone is required" / "Enter a valid Moroccan phone number" messages.

### 2. Verification submit silently fails — chat keeps asking to resubmit

**Root cause (verified via DB):** the trigger `protect_profile_sensitive_fields` pins `verification_status` to its OLD value for any non-admin update. So when `Verification.tsx` calls `update profiles set verification_status='pending_review'`, the trigger silently reverts it. The DB only ever holds `verified` / `unverified` (confirmed by `select verification_status, count(*) from profiles`). The renter sees no error toast, but ChatThread continues to read `unverified` → keeps rendering "Verify my account" instead of "under review".

**Fix (DB migration):** rewrite `protect_profile_sensitive_fields` so a regular user is allowed exactly one transition on `verification_status`:

- `unverified` → `pending_review`
- `rejected`   → `pending_review`

Any other change (especially `pending_review|rejected → verified`, or any change to `is_verified`) stays admin/service-role only. `submitted_at` and `rejection_reason` need to be writable in that same allowed transition (set `submitted_at = now()`, clear `rejection_reason`).

Also keep `phone`, `first_name_on_id`, `family_name_on_id`, `id_card_number`, `id_*_image_url`, `selfie_with_id_url` writable as today.

**No client changes** — `Verification.tsx`, `ChatThread.tsx`, `VerificationBanner.tsx` already handle `pending_review` correctly. The realtime subscription in ChatThread will flip the composer to "Your account is under review" automatically once the trigger no longer reverts the status.

### 3. CashPlus voucher reference: copy on payment page = reference on confirmed page

**Current mismatch**
- `PaymentCashPlus.tsx` displays `voucherRef = payment?.transaction_id || urlParam.transaction_id || payment.id` (so when YouCan hasn't returned the `cp...` code yet, it shows the UUID).
- `BookingConfirmed.tsx` only ever displays `youcanpay_payments.transaction_id` (the `cp...` code), and shows "Generating your Cash Plus reference…" until it appears.
- User can copy a code on the payment page that doesn't match the one later shown on the confirmation page → confusion.

**Fix (frontend only — `src/pages/PaymentCashPlus.tsx` and `src/pages/BookingConfirmed.tsx`)**

A. **Lock the copied value as the source of truth**
   - In `PaymentCashPlus.tsx`, only show the big copyable "Voucher reference" block when `payment?.transaction_id` is set (the real `cp...` code). Until then, show a small "Generating your Cash Plus reference…" placeholder identical in copy to BookingConfirmed, with the existing background poll. No copy button, no UUID fallback.
   - This guarantees that the code the user copies is the same `cp...` code BookingConfirmed will display.

B. **Auto-redirect after copy with a 10-second countdown**
   - When the user clicks "Copy" and the copy succeeds, start a 10-second countdown displayed on the same screen ("Redirecting to your booking in 0:10…").
   - During the countdown, persist the copied value to `sessionStorage` under key `cashplus:lastCopiedRef:<bookingId>` (and pass it via URL hash `#ref=<code>` as a backup).
   - When the countdown reaches 0 (or user clicks "Go to my booking now"), navigate to `/booking/:id/confirmed`.
   - The user can also cancel the countdown to stay on the page.

C. **BookingConfirmed picks up the copied reference instantly**
   - In `BookingConfirmed.tsx`, after computing `cashplusReference` from `youcanpay_payments.transaction_id`, also read the sessionStorage / hash fallback. If the DB hasn't yielded `transaction_id` yet, render the sessionStorage value (it is the exact code the user just copied). Once the DB value arrives via `youcanpay-verify-payment` (already wired up), they will be identical, so the displayed code never changes under the user's eyes.
   - Show a small subline "Same code you just copied" the first time it loads from sessionStorage, to reassure the renter.

**No backend / schema / edge function changes for fix #3.**

## Out of scope
- Phone OTP verification flow (only making the field required, not adding SMS verification).
- Admin verification dashboard.
- Translating the new strings — reuse existing keys where possible, add minimal English fallbacks otherwise.
