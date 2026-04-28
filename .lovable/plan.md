## Goal

Reorganize the admin panel into clearer, role-focused sections so the admin can supervise rentals, payments, communications and fleet from purpose-built screens.

## 1. New "Payments" tab (split from Bookings)

- Add a new top-level admin tab **Payments** (icon: `CreditCard`), placed right after Bookings.
- Move the `StuckPaymentsCard` widget out of `AdminBookingsTab.tsx` into a new `AdminPaymentsTab.tsx`.
- Expand it into a proper page with three sub-sections (segmented control):
  1. **Stuck** — current behavior (YouCan Pay pending > 10 min, Verify now button).
  2. **All payments** — paginated table of `youcanpay_payments` with filters: status (pending / paid / failed / refunded), purpose, date range, customer email search.
  3. **Booking payments** — table of `booking_payments` (manual cash/transfer entries), filterable by method, status, date.
- Each row links to its parent booking when available.
- Permission key: reuse `bookings` permission for now (no schema change needed).

## 2. Bookings tab — focused on bookings only

- Remove `<StuckPaymentsCard />` from `AdminBookingsTab.tsx` (line 401).
- Tighten the filter bar into a single clean toolbar:
  - Search (name / email / phone / bike)
  - Status group: **Booking status** (pending, confirmed, in_progress, completed, cancelled, rejected) and **Admin status** (new, reviewed, confirmed, rejected) shown as two segmented dropdowns side-by-side.
  - Quick chips: Today · This week · Overdue · Unassigned.
  - Date range with "Created / Pickup / Return" toggle (already exists — keep).
- Status counts strip above the table (small color-coded pills): New · Confirmed · In progress · Completed · Cancelled.
- Row click → opens existing `AdminBookingDetails` page.

## 3. Booking detail page — Messages + History

In `src/pages/admin/AdminBookingDetails.tsx`, add a `Tabs` block under the booking summary with:

- **Overview** — current detail view (price breakdown, customer info, payment section).
- **Messages** — read-only thread of `booking_messages` between renter and agency. For each message show sender role, body, timestamp, and a red badge if `flagged = true` with the `flag_reasons`. Top of pane shows a "Policy violations" summary card (count of flagged messages, list of detected reasons such as phone numbers / WhatsApp / off-platform payment asks).
- **History** — existing `BookingTimeline` events (already wired) plus payment events merged into one chronological feed.
- **Admin actions** (sidebar, always visible): Warn user · Apply penalty (amount in MAD) · Ban user — these write to `audit_logs` and `client_trust_events`, and update `profiles.is_blocked` / `frozen_reason` when banning. Penalty creates a `booking_payments` row with `payment_type = 'penalty'`.

RLS: admins already have read access to `booking_messages` via the existing policy. No schema change required for the read view. The penalty/ban actions use existing admin update permissions on `profiles` and existing insert permissions on `client_trust_events` and `audit_logs`.

## 4. Rename "Clients" → "Renter Clients"

- Update the tab label in `AdminPanel.tsx` (line 86) to use a new translation key `admin.renterClients`.
- Add `"renterClients": "Renter Clients"` (en), `"Clients particuliers"` (fr), `"العملاء المستأجرون"` (ar) to the `admin` block in the three locale files.
- Tab value stays `clients` (no route changes).

## 5. Replace "Fleet" with "Bikes" — grouped by agency

Rename tab **Fleet → Bikes** (icon stays `Bike`, key `admin.bikes`). Rewrite `AdminFleetTab.tsx` (or add a new `AdminBikesTab.tsx` and swap the import) into one unified Bikes management view.

### Data model

No new tables. Continue using:
- `bike_types` (owner_id → profiles.id, agency_id via owner profile, approval_status)
- `bike_inventory` (per-location quantities)
- `agencies` and `profiles` (for business name + verification)

A single fetch loads all `bike_types` regardless of `is_original`, joined with the owner profile and agency. Original Motonita bikes (`owner_id IS NULL` or `is_original = true`) are bucketed under a virtual "Motonita (platform)" agency so the same UI works for both.

### UI (single page, no Original/Business split)

Top metrics: Total bikes · Pending review · Approved · Rejected · Agencies with bikes.

Toolbar: search (bike or agency name) · status filter (All / Pending / Approved / Rejected) · agency filter (dropdown of agencies that have bikes) · "Add bike type" button.

Below: an accordion of **Agency cards**. Each agency row (collapsed by default, but auto-expanded if it contains pending bikes):

```text
[Logo] Business Name        [Verified ✓]   12 bikes · 2 pending · 8 approved · 2 rejected
                                            [Expand ▾]
─────────────────────────────────────────────────────────
| img | Bike name      | Price/day | Inventory | Status   | Actions             |
| img | Honda PCX 125  | 250 DH    | 4/6       | Pending  | Approve · Reject · View |
| ... | ...            | ...       | ...       | ...      | ...                 |
```

Per-bike actions inside the card:
- **Approve** / **Reject (with reason)** — when status is pending, same handlers as today.
- **View / Edit** — navigate to `/admin/fleet/:id` (existing route stays).
- **Soft delete** — keeps existing `business_status = 'admin_deleted'` flow; hidden from list by default with a "Show deleted" toggle.
- **Hard delete** — only for original Motonita bikes.

Pending bikes also surface in a sticky "Needs review" banner at the top of the page that scrolls to the relevant agency card on click.

### Cleanup

- Remove the two-tab layout (`Original` / `Business Submissions`) from `AdminFleetTab.tsx`.
- Delete or leave in place the `is_original` field — UI no longer surfaces this concept, but the flag remains in DB for backwards compatibility.

## 6. Translations

Add the following keys in `en`, `fr`, `ar` under `admin`:

- `bikes`: "Bikes" / "Motos" / "الدراجات"
- `payments`: "Payments" / "Paiements" / "المدفوعات"
- `renterClients`: "Renter Clients" / "Clients particuliers" / "العملاء المستأجرون"
- `messages`: "Messages" / "Messages" / "الرسائل"
- `history`: "History" / "Historique" / "السجل"
- `policyViolations`: "Policy violations" / "Violations de politique" / "انتهاكات السياسة"

## Files touched

- `src/pages/AdminPanel.tsx` — add Payments tab, rename Fleet→Bikes label, rename Clients label.
- `src/components/admin/AdminBookingsTab.tsx` — remove StuckPaymentsCard, polish filters/status strip.
- `src/components/admin/AdminPaymentsTab.tsx` — **new**, hosts segmented Stuck / All / Booking payments views.
- `src/components/admin/StuckPaymentsCard.tsx` — keep, now consumed by Payments tab.
- `src/components/admin/AdminFleetTab.tsx` — rewritten as unified Bikes-by-Agency view (or replaced by `AdminBikesTab.tsx`).
- `src/pages/admin/AdminBookingDetails.tsx` — add Tabs (Overview / Messages / History) and admin action sidebar (warn / penalty / ban).
- `src/components/admin/bookings/BookingMessagesPanel.tsx` — **new**, read-only chat with flag highlights.
- `src/locales/en.json`, `fr.json`, `ar.json` — new keys above.

## Out of scope (will not change)

- No DB schema changes; all new views read from existing tables and policies.
- No changes to the renter or agency UI.
- No edits to YouCan Pay edge functions.
- 10 MAD platform fee remains prepaid via YouCan Pay (rule unchanged).
