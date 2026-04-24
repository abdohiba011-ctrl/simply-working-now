## Move verification gate to AFTER payment

**Goal:** Renter flow becomes Book → Pay 10 MAD → (if unverified) Verify ID + phone → Confirmation/Chat. Verified renters skip the verification step entirely.

### 1. `src/pages/BookingReview.tsx`
- Remove `isVerified` / `hasPhone` state, `checkProfileStatus()`, and the `useEffect` that calls it.
- Remove the two pre-payment gates in `handleContinue` (the `!isVerified` and `!hasPhone` blocks that redirect to `/verification`).
- Remove the yellow "Verify your identity" warning card from the JSX.
- Remove the loading skeleton tied to `isCheckingProfile`.
- Result: authenticated users go straight to `/checkout`. Unauthenticated users still get bounced to `/auth` first (unchanged).

### 2. `src/pages/Checkout.tsx`
- In `handlePay`, drop the `if (!profile?.name || !profile?.phone)` block that currently redirects to `/verification` before paying. Only `name` + `email` are needed for `promote_hold_to_booking`; pass `profile.phone || null` (the RPC accepts null).
- Update the YouCanPay `success_path` so the thank-you page knows whether to route to verification next:
  `/thank-you?type=booking&bookingId=${bookingId}&needsVerification=${profile.is_verified ? '0' : '1'}`
- Also fetch `is_verified` in the existing profile query (line ~30-50) so we can pass that flag.

### 3. `src/pages/ThankYou.tsx` (post-payment landing)
- Read `needsVerification` and `bookingId` from URL.
- If `needsVerification === '1'` → after a brief "Payment received ✅" message, auto-redirect (or CTA) to `/verification?bookingId=${bookingId}&next=/confirmation/${bookingId}`.
- If `0` → CTA goes to `/confirmation/${bookingId}` as today.

### 4. `src/pages/Verification.tsx`
- Read `bookingId` and `next` from `useSearchParams`.
- If `bookingId` present, render a green banner at the top: *"Payment received ✅ — One last step to unlock your booking and chat with the agency."*
- Phone field is already present (line 68) and required — no change needed.
- On successful submission, if `next` query param is present, `navigate(next)` instead of the current `/` redirect.
- Keep the "already verified" early redirect, but if `next` is set, send them to `next` instead of `/`.

### 5. `src/pages/Confirmation.tsx`
- After fetching booking + profile, if `profile.verification_status === 'pending_review'`, show a soft amber banner above the chat: *"Your ID is under review. You can chat with the agency now; they'll confirm pickup once verification completes."*
- Chat remains unlocked regardless (no logic change to BookingChat).

### 6. No DB / no migration
- Booking is already created with `payment_status='paid'` before verification.
- Agency RLS already allows them to see/chat with paid bookings via `assigned_to_business`.
- Verification status is independent of booking status — agency can choose to wait or proceed.

### Outcomes
- ✅ Verified renter: Book → Pay → ThankYou → Confirmation+Chat (no verification prompt).
- ✅ New renter: Book → Pay 10 MAD → ThankYou → Verification (phone + ID, with success banner) → Confirmation+Chat.
- ✅ Payment is never blocked by missing verification or phone.
- ✅ Existing chat, inbox, off-platform protection, and agency wallet flow are untouched.