# Renter Clients UX fixes + Business Clients reorg

Two related fixes in the admin Clients area, plus a small backend cleanup so the renter side, business side, and admin side stay in sync.

## 1. Renter Clients tab — fix the data and shrink the status row

### 1a. "Verified shows 1 but the table is empty" bug

Cause: the four stat cards at the top of the Clients tab (`AdminPanel.tsx`, `fetchStatusCounts`) count **every row** in `profiles` matching the status, including business-owner profiles. The unified clients table below them only loads `user_type IN (null, 'client', 'renter')` (`AdminUnifiedClientsTab.fetchClients`). So a verified agency owner counts toward "Verified" but never appears in the renter table → "1 verified, table empty".

Fix:
- Scope every status-count query in `fetchStatusCounts` with the same `user_type IN (null, 'client', 'renter')` predicate the table uses. Counts and table will always agree.
- Same scope on the inline badge counts inside `AdminUnifiedClientsTab` (already derived from the same fetched array — leave as-is, but verify after the parent fix).

### 1b. "Clients disappear / statuses take time"

Cause: stats are fetched once on mount (`useEffect([isAdmin])` in `AdminPanel.tsx`) but the table refetches independently. After freezing/unfreezing or marking verified, the parent counts go stale until a full reload — which looks like "clients disappear".

Fix:
- Lift a tiny refresh signal: when the table refetches (after freeze, send-notification, status change), call a parent callback to also re-run `fetchStatusCounts`. A simple `onDataChanged` prop on `AdminUnifiedClientsTab` is enough.

### 1c. Make the status row compact (icon · number · word, single line)

The four status cards currently render as a 2×2 / 4-column grid of large cards (`AdminPanel.tsx` lines 218–235). Replace with a single horizontal pill row, same idea as the badge row already used inside the unified tab:

```text
[Clock 3 Pending] [✓ 12 Verified] [✗ 4 Not Verified] [UserX 1 Blocked]
```

- One row, `flex flex-wrap gap-2`.
- Each pill: `<Icon> {count} {label}` on a single line.
- Active filter gets `variant="default"`; others use the muted/colored outline style (success, warning, etc.).
- Drops vertical space by ~80px.

## 2. Business Clients tab — drop the Shops/Individuals split

### 2a. Hide the type filter and the "X shops · Y individuals" caption

In `AdminBusinessClientsTab.tsx`:
- Remove the `All / Shops / Individuals` button group (lines ~562–588).
- Remove the `{shopsCount} shops · {individualsCount} individual owners` caption (line 558). Replace with `{totalCount} business clients`.
- Drop `typeFilter` state, related `fetchAggregates` call, `shopsCount` / `individualsCount` state. Keep `frozenCount` if used elsewhere.
- Stop sending `business_type` constraints in `fetchBusinesses`.

### 2b. Keep the type as a badge (only)

The Type column in the table stays. Since for now we treat everyone as business, the badge will read **"Shop"** or **"Individual"** based on `business_type`, with the same `Store` / `User` icon — but the user can no longer filter on it. This way nothing breaks for the existing rows, and the user can see what each business is.

### 2c. Apply the same compact pill change to the in-tab status row (already partially compact)

No layout change needed — the existing `Total / Frozen` block is already small. Just remove references to `shopsCount` / `individualsCount` chips.

## 3. Become a Business — redesign the partner flow

### Current flow (today)

`/become-business` asks for:
- Individual: auto-entrepreneur number, bike count
- Shop: company RC, business name, bike count

It writes a `contact_messages` row of type `business_application`, and on admin approval the user gets the agency role + `business_type = individual_owner | rental_shop`.

### New flow (per user direction)

Two partner types (no name change required — keep the labels but redesign the data):

**Option A — Business / Shop (`business_type = 'rental_shop'`)**: existing fields stay (RC, business name, bike count).

**Option B — Individual (`business_type = 'individual_owner'`)**: replace auto-entrepreneur number with **three required document uploads**:
1. ID card front
2. ID card back
3. Photo of the motorbike
4. Photo of the **ownership / registration paper** (carte grise) of the motorbike

(That's 4 uploads — the user said "three things" then listed four. Build all four, treat the first two as one logical "ID card" group in the UI.)

### How we'll store the uploads

- New private storage bucket `business-applications/` (private, signed URLs only).
- New table `business_application_documents`:
  - `id`, `application_id` (uuid → contact_messages.id), `kind` (text, one of `id_front`, `id_back`, `bike_photo`, `ownership_paper`), `file_path` (text), `file_size`, `created_at`.
  - RLS: applicant can insert/select their own; admins can select all.

The application (parent `contact_messages` row) keeps the rest of the JSON payload for now to avoid a bigger migration.

### Admin review

In `AdminBusinessClientsTab` → Applications panel, when reviewing an Individual application show all four documents inline (signed URLs, lightbox preview). Approval still flips `user_type = business`, `business_type = individual_owner`, and gives the user the `agency` role.

### Badging on the admin side

The Business Clients table keeps its `business_type` badge → "Shop" or "Individual". Across the rest of the admin (bookings, fleet) we already display the agency name, no change needed.

## 4. Cross-side data sync sanity pass

Make sure these flows still hold once the changes ship — code review only, no UI work needed if all green:

- Renter freezes / unfreezes (admin Clients) → `profiles.is_frozen` → BlockedUserCheck modal on renter side.
- Business approval (admin Business Clients → Approve) → adds `agency` role + sets `business_type` → user's bikes appear in Bikes tab grouped under their agency.
- Bike submitted from agency side → `notify_admins_on_bike_submit` trigger → notification in admin → bike shows in Fleet tab and the Cities tab live count.
- City / neighborhood toggled in admin Cities tab → `service_cities.show_in_homepage` realtime → renter homepage updates.

I'll spot-check each path by reading the trigger / hook code; no migrations needed for #4.

## Files to change

- `src/pages/AdminPanel.tsx` — scope status counts to renters; replace 4-card grid with compact pill row; pass `onDataChanged` to unified tab.
- `src/components/admin/AdminUnifiedClientsTab.tsx` — call `onDataChanged?.()` after refetch; minor style tweaks if needed.
- `src/components/admin/AdminBusinessClientsTab.tsx` — drop `typeFilter` UI/state, drop `shopsCount`/`individualsCount`, simplify caption.
- `src/pages/BecomeBusiness.tsx` — replace the auto-entrepreneur input with the four document uploaders for the Individual path; keep Shop path as-is.
- `supabase/migrations/<new>.sql` — create `business-applications` storage bucket + `business_application_documents` table + RLS policies.
- `src/components/admin/AdminBusinessApplicationsTab.tsx` (or whichever renders the application detail dialog) — render the four documents for individual applications.

No changes to the renter-side rental / booking flow.
