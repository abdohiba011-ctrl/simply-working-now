## 1. Booking Confirmed page (`src/pages/BookingConfirmed.tsx`)

Two action blocks currently exist (lines ~375 and ~566) showing both "View my bookings" and "Message agency" side by side.

- Remove the "View my bookings" link/button in both blocks.
- Promote "Message agency" to the primary CTA:
  - Full width on mobile, large size (`size="lg"`), uses primary/hero variant.
  - Stays prominent on desktop (large, full-width within its container, not crammed beside another button).
  - Keeps the `MessageCircle` icon.
  - Links to the existing chat thread for this booking (same target it already uses).

## 2. Verification page (`src/pages/Verification.tsx`)

Three render branches each include `<Header />` and/or `<Footer />` (lines 648/652, 660/704, 711/...).

- Remove all `<Header />` and `<Footer />` usages from this page.
- Remove the now-unused imports.
- Keep page background and main content padding so it still looks framed without the chrome.

## Out of scope

- No changes to routing, business logic, payment flow, or other pages.
