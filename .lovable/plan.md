## Goal

Lock down the public marketplace behind a **two-gate approval pipeline**:

1. **Shop gate** — an agency must be admin-verified before any of its motorbikes can appear publicly.
2. **Motorbike gate** — every motorbike listing also needs admin approval before it's listed, even after the shop is verified.

Agencies can keep working in their dashboard at every stage (create shop → add bikes), but listings stay hidden until both gates flip to approved.

---

## Current state (audited)

- `agencies` table already has `verification_status` + `is_verified` and the agency-side `Verification.tsx` upload flow exists.
- `AdminVerifications.tsx` only reviews **renter ID verification** (queries `profiles`); there is **no admin queue for agency-shop verification**.
- The motorbike catalog actually used by the agency wizard is `bike_types` (with `approval_status`, `business_status`, `owner_id`) — and `BusinessMotorbikes.tsx` already shows pending/approved/rejected counts. The renter `Listings.tsx` reads from `bike_types` indirectly via `useBikeTypes` (no approval filter today).
- `bikes` (the per-unit fleet) and the public view `bikes_public` have **no `approval_status` and no agency join**, so unverified-agency or unapproved bikes can leak into search.
- Admin notifications (`useAdminNotifications.ts`) already listen for `bikes.approval_status=pending` and `profiles.verification_status=pending_review` — but neither subscription targets agency-shop submissions today.

---

## Changes

### 1. Database migration

- Add `verification_status` (default `'not_submitted'`) and `submitted_at` indexing on `agencies` (column already exists; just ensure a check + index for the admin queue).
- Add `approval_status` (`pending` | `approved` | `rejected`, default `pending`) and `agency_id` (FK → `agencies.id`) to **`bikes`** so per-unit bikes inherit the same gate as the catalog.
- Backfill: link existing `bikes.owner_id` to the matching `agencies.profile_id` to populate `agency_id`.
- Replace the `bikes_public` view to **only return rows where**:
  `bikes.available = true AND bikes.approval_status = 'approved' AND agencies.is_verified = true`.
- Same gate for `bike_types` exposed publicly: filter `useBikeTypes`/`useBikes` queries to `approval_status = 'approved'` and join-verify the owner agency.
- New trigger `notify_admins_on_agency_submit` — when `agencies.verification_status` flips to `pending_review`, insert one row per admin into `notifications` (mirrors the existing renter-verification trigger added last loop).
- New trigger `notify_admins_on_bike_submit` — when a `bikes` row is inserted with `approval_status='pending'` (or a `bike_types` row likewise), notify all admins.
- Indexes: `agencies(verification_status)`, `bikes(approval_status, agency_id)`.

### 2. Agency dashboard

- In `agency/Verification.tsx`: persist submission timestamp, lock the form once status is `pending_review` / `verified` / `rejected`, show a status badge.
- In `agency/MotorbikeWizard.tsx` and `BusinessMotorbikes.tsx`:
  - Allow creating bikes regardless of shop status.
  - Always insert with `approval_status='pending'`.
  - Show a banner: "Your shop is awaiting verification — listings won't appear publicly until verified" when the agency isn't yet verified.
  - Show per-bike status badge (Pending / Approved / Rejected) — already exists for `bike_types`; mirror it on the per-unit `bikes` list.

### 3. Admin panel

- New page `src/pages/admin/AdminAgencyVerifications.tsx` (route `/admin/agencies/verifications`) listing agencies with `verification_status='pending_review'`, with approve/reject actions that set `is_verified` and `verification_status` accordingly and write an audit log entry.
- New page `src/pages/admin/AdminBikeApprovals.tsx` (route `/admin/bikes/approvals`) listing both `bikes` and `bike_types` with `approval_status='pending'`. Approve/reject actions update the row.
- Add both to the admin sidebar in `AdminPanel.tsx` with unread-count badges sourced from the existing notification bell.

### 4. Renter-facing (public) gate

- Update `useBikes` / `useBikeTypes` to only return rows from approved bikes belonging to verified agencies (the new `bikes_public` view does the heavy lifting; the type-level filter is added in the hook).
- Add a small "Verified Agency" badge on the bike card to reinforce trust.

---

## Files to change

```
supabase/migrations/<new>.sql                  # columns, view, triggers, indexes
src/pages/admin/AdminAgencyVerifications.tsx   # new
src/pages/admin/AdminBikeApprovals.tsx         # new
src/pages/AdminPanel.tsx                       # nav entries + badge counts
src/pages/agency/Verification.tsx              # persist + lock + badge
src/pages/agency/MotorbikeWizard.tsx           # always insert pending
src/pages/agency/Motorbikes.tsx                # status badges + banner
src/pages/business/BusinessMotorbikes.tsx      # banner if shop unverified
src/hooks/useBikes.ts                          # public filter
src/hooks/useAdminNotifications.ts             # subscribe to agency submits
src/components/agency/AgencyLayout.tsx         # global "shop pending" banner
```

---

## Out of scope

- No change to renter ID verification flow (already fixed last loop).
- No change to the 10/50 MAD fee model or booking flow.
- No automatic re-approval on edits — any material edit to a bike will reset `approval_status` to `pending` (handled in a follow-up if requested).
