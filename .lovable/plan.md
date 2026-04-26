# Agency Panel — Full Audit & Fix Plan

I tested every page in `/agency/*` (Dashboard, Bookings, Booking detail, Motorbikes, Motorbike wizard, Motorbike detail, Messages, Calendar, Finance hub → Wallet/Transactions/Subscription/Invoices, Agency Center hub → Profile/Team/Verification/Analytics, Settings hub → Preferences/Notifications/Integrations/Help) and the shared chrome (`AgencyShell`, `Sidebar`, `Header`, `MockProtectedRoute`).

Below are the real bugs grouped by severity. **No code is changed yet** — switch to default mode after approval and I'll implement everything.

---

## 🔴 Critical (broken functionality / security)

### 1. Booking status filters never match (Dashboard / Bookings / Calendar)
- The bookings table uses `booking_status` as the canonical column (`pending`, `confirmed`, …) but `Dashboard.tsx`, `Bookings.tsx`, `Calendar.tsx` filter on the legacy `b.status`.
- **Effect:** the "Pending bookings" tile, the status filter buttons, and the `?status=pending` deep link from the dashboard all silently return wrong/empty results.
- **Fix:** use `booking_status` (with `status` as fallback) everywhere on the agency side, and update `StatusChip` calls accordingly.

### 2. Unverified-agency redirect loop
- `MockProtectedRoute` redirects every unverified agency to `/agency/verification`.
- That route is now a `<Navigate>` to `/agency/agency-center#verification`. The guard's `pathname.includes("/agency/verification")` no longer matches the new path → redirect loop risk + unverified agencies are blocked from Dashboard, Bookings, etc.
- **Fix:** allow unverified agencies to use the dashboard but show a persistent banner; only block sensitive actions (new bike, accept booking). Update the guard's path check to recognize `/agency/agency-center` (and never block the agency center itself).

### 3. Agency "Confirm booking" silently fails
- `BookingDetail.tsx` updates `status: "confirmed"` directly. The DB trigger `bookings_protect_sensitive_fields` strips that change for non-admins (only allows `cancelled`).
- **Effect:** toast says "Booking confirmed" but the row is unchanged; no wallet fee deduction, no event log.
- **Fix:** call a new `confirm_booking` RPC (security definer) that validates the agency owns the booking, sets `booking_status='confirmed'`, deducts the 50 MAD agency fee from `agency_wallets`, and inserts a `booking_events` row.

### 4. Profile page lets users escalate themselves (security finding)
- `Profile.tsx` updates the `profiles` row, but the table's UPDATE policy allows any authenticated user to set `verification_status`, `is_verified`, `trust_score`, `is_frozen`, `user_type`, `subscription_plan`.
- **Fix:** add a column-level check in a new RLS policy that prevents users from modifying these fields (only admins / triggers can). The form itself only writes `business_*` fields, so it stays functional.

### 5. Wallet / Subscription don't refresh after returning from YouCanPay
- After payment in the popup, the parent tab never refreshes balance or plan.
- **Fix:** on mount, look for `?yc=success&pid=…` in the URL hash/search, call `refresh()`, then strip the params; also add a 5×3s poll on the payment id to handle webhook race conditions.

### 6. Realtime channel auth missing (security finding)
- `booking_messages` is published to Realtime but no RLS exists on `realtime.messages`. Any authenticated agency can subscribe to another agency's booking channel.
- **Fix:** add an RLS policy on `realtime.messages` restricting topic subscriptions to the booking's `user_id` or `assigned_to_business`.

---

## 🟠 Major (broken UX, missing features)

### 7. `Verification.tsx` is a dead-end placeholder
- It shows only a "coming soon" empty state, but unverified users are forced here. They have nothing to upload.
- **Fix:** build a minimal upload form (RC, ICE, RIB, insurance) writing to `client_files` (existing bucket) and creating an admin verification request. Keep scope tight: file pickers + status badges, no full review UI.

### 8. Free-plan downgrade bypasses billing rules
- `Subscription.tsx` directly UPDATES `agency_subscriptions` to `plan: 'free', status: 'active'`. A `locked`/`past_due` user can flip themselves back to free + active without any review.
- **Fix:** add a `request_plan_downgrade` RPC that only allows transition to `free` when the current `status` is `active` or `trialing`.

### 9. Add-Motorbike wizard issues
- "Image URL" is a plain text input — agencies can paste anything.
- Doesn't set `city_id`, `category`, `availability_status` → new bikes don't appear in public city listings.
- No check against the Free-plan 3-bike limit.
- **Fix:** swap the URL input for the existing `ImageUpload` component (writes to `bike-images` bucket); add `city_id` select (from `service_cities`) + `category` select; before insert, count owned bikes and block when the user is on Free with ≥ 3.

### 10. Agency Messages misses unassigned bookings & no realtime
- Filters strictly by `assigned_to_business = userId`. Newly created pending bookings against the agency's bikes (before assignment) don't appear.
- No realtime subscription, so new messages need a manual reload.
- **Fix:** widen the query to also include bookings where `bike.bike_type.owner_id = userId`; subscribe to `booking_messages` inserts for the active booking via Supabase Realtime.

### 11. Locked-account overlay leaks navigation
- `AgencyShell` renders the lock overlay only inside `<main>` with `absolute inset-0`. The sidebar and header remain interactive, so locked users can still navigate to other pages and trigger writes.
- **Fix:** lift the overlay to cover the whole `AgencyShell`, and short-circuit the `<Outlet />` so children never render when `isLocked`.

---

## 🟡 Minor (polish, but visible)

### 12. Header breadcrumb shows raw slugs for new hubs
- `ROUTE_NAMES` in `Header.tsx` doesn't include `agency-center`, `finance`, `settings` → breadcrumb prints `agency-center` literally.
- **Fix:** add the missing entries.

### 13. Command palette navigates to dead routes
- It iterates `ROUTE_NAMES` and pushes `/agency/{slug}` — but `wallet`, `transactions`, etc. are now redirect-only. Works via redirect, but feels stale.
- **Fix:** map each command to its real hub URL (e.g. Wallet → `/agency/finance#wallet`) and add the three hubs themselves.

### 14. Notification bell is decorative
- Bell shows a red dot but does nothing on click.
- **Fix:** open a dropdown listing the latest 10 rows from the existing `notifications` table; mark as read on click.

### 15. Help "Start chat" button is dead
- The "Live chat" card on `Help.tsx` shows "Online now" but the button has no handler.
- **Fix:** either remove the badge + disable the button (with "Coming soon" tooltip) or link to the existing contact form / `support@motonita.ma` mailto.

### 16. Mobile sidebar collapse chevron is misleading
- Inside the mobile `<Sheet>`, clicking the chevron closes the whole sheet instead of toggling collapsed mode.
- **Fix:** hide the collapse chevron when the sidebar is rendered inside the mobile sheet.

### 17. Agency-side `Plan` shown is stale after upgrade
- The Dashboard pill shows `subscription.plan` but `useAgencySubscription` only fetches once. After upgrade the value stays "free" until reload.
- **Fix:** part of bug #5 (auto-refresh after payment).

### 18. Subscription URL fragment loses tab on success return
- YouCanPay edge function hardcodes `success_url` to `/agency/finance#wallet` even for subscription purchases.
- **Fix:** pass `success_path` / `error_path` from the client (`/agency/finance#subscription`) and respect them in the edge function (already supported via `body.success_path`, just unused by the subscription page).

### 19. Bookings table column mismatch with `total_days`
- `BookingDetail.tsx` shows `total_days ?? "—"`, but the field is computed by the trigger and may be 0 for old rows. Not a bug, just confusing UI — show calculated `differenceInDays(return,pickup)` as fallback.

### 20. Empty-state for some hubs has missing description after wrapping
- `Verification`, `Team`, `Analytics`, `Integrations`, `Help` (when shown via the Hubs) have a doubled top heading (the hub renders its own `<h1>` and the inner page renders another). Not crashy but visually redundant.
- **Fix:** drop the inner `<h1>` from the four hub-only pages; keep them only when accessed directly (no longer possible since direct routes are redirects).

---

## What I will change (file list, after approval)

**Pages**
- `src/pages/agency/Dashboard.tsx` — use `booking_status`, refresh after payment return.
- `src/pages/agency/Bookings.tsx` — use `booking_status`.
- `src/pages/agency/Calendar.tsx` — use `booking_status`.
- `src/pages/agency/BookingDetail.tsx` — call new `confirm_booking` RPC, show fee deduction.
- `src/pages/agency/Wallet.tsx` — auto-refresh on `?yc=success`, pass `success_path`.
- `src/pages/agency/Subscription.tsx` — auto-refresh on `?yc=success`, pass `success_path=/agency/finance#subscription`, route downgrade through new RPC.
- `src/pages/agency/Verification.tsx` — real upload form.
- `src/pages/agency/Messages.tsx` — widen query + realtime subscription.
- `src/pages/agency/MotorbikeWizard.tsx` — image upload, city/category selects, plan limit check.
- `src/pages/agency/Help.tsx`, `Team.tsx`, `Analytics.tsx`, `Integrations.tsx` — drop duplicate `<h1>` when inside hubs; disable dead "Start chat" button.

**Shared chrome**
- `src/components/auth/MockProtectedRoute.tsx` — relax verification gate, recognize new agency-center path.
- `src/components/agency/AgencyShell.tsx` — full-shell lock overlay; short-circuit `<Outlet />` when locked.
- `src/components/agency/Header.tsx` — fix breadcrumb names; functional notifications dropdown; updated command palette targets.
- `src/components/agency/Sidebar.tsx` — hide collapse chevron in mobile sheet.

**Hooks**
- `src/hooks/useAgencyData.ts` — return `booking_status` consistently; add `useAgencyNotifications`.

**Backend (migration + edge function)**
- New RPCs: `confirm_booking(_booking_id uuid)`, `request_plan_downgrade()`.
- New RLS: column-restricted UPDATE policy on `profiles`; channel-auth policy on `realtime.messages`.
- `supabase/functions/youcanpay-create-token/index.ts` — already supports `success_path`, no change needed; just verify it's used correctly from clients.

---

## What I will NOT touch (out of scope for "agency only")
- Renter-facing pages (`/`, `/rent/*`, `/auth/*`).
- Admin panel.
- The 16-bug checklist from earlier loops that's already done (city dropdown, become-partner removal, etc.).

Reply **go** to start the fixes.