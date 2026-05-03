
## Goal

Today, both **Renter Clients** and **Business Clients** tabs in the admin panel open the same `/admin/clients/:id` page (`AdminClientDetails.tsx`), which is designed for individual renters (trust score, ID verification, renter bookings, etc.). The user wants business users (agencies / individual owners) to have a **completely separate experience** built for businesses, and the **Verifications** screen for businesses to show business verification submissions — not renter ID verifications.

This plan keeps the renter flow exactly as-is and adds a parallel, dedicated business flow.

## Scope of changes

### 1. New dedicated "Business Details" page

**New file:** `src/pages/admin/AdminBusinessDetails.tsx`
**New route:** `/admin/business/:id` (lazy-loaded in `src/App.tsx`)

Layout (different from renter page — business-oriented, not trust/ID-oriented):

- **Header card**
  - Business logo (editable) + business name (editable inline)
  - "Business User" label under name (shows type: Rental Shop / Individual Owner / Unspecified)
  - Copy buttons for email, phone, business ID
  - Status chips: Verification status, Subscription plan (Free / Pro / Business), Locked / Suspended
  - Action buttons:
    - **Open Agency Dashboard** (opens agency dashboard view of this business in a new tab)
    - **Send Notification**
    - **Verify / Request Re-verification**
    - **Suspend / Unsuspend**
    - **Block / Unblock**

- **Tabs** (business-specific, no trust score):
  1. **Overview** — business profile (RC, ICE, address, city, neighborhood, lat/lng, delivery offered, delivery fee, delivery radius, bio, phone, owner profile link, account age, last active)
  2. **Verification** — agency verification submission: documents (RC, AE card, ICE cert, owner ID front/back), status, history, approve / reject with reason. Reuses the document fetching logic from `AdminAgencyVerifications.tsx`.
  3. **Fleet** — list of bikes owned by this business with approval/business status, daily price, link to `/admin/bikes/:id` review page; counts of approved / pending / rejected
  4. **Bookings** — bookings where `assigned_to_business = user_id`, with status, dates, renter, totals. Link to `/admin/bookings/:id`
  5. **Wallet & Subscription** — wallet balance, recent `agency_wallet_transactions`, subscription plan, trial / grace period dates, withdrawal requests
  6. **Notes & Files** — internal admin notes and file attachments (reuses `client_files` and notes patterns already used for renters, scoped to this user_id)
  7. **Timeline** — `client_timeline_events` for this user_id (reused as-is) plus business-specific events (verification approved/rejected, fleet changes)

- No trust score tab. No ID verification tab (those stay on renter side).

### 2. Update routing for business clients

**File:** `src/components/admin/AdminBusinessClientsTab.tsx`
- Change the row "View" buttons (currently `navigate('/admin/clients/${biz.id}')`) to `navigate('/admin/business/${biz.id}')`.

Renter rows in `AdminUnifiedClientsTab.tsx` are unchanged — they still go to `/admin/clients/:id`.

### 3. Verifications screen split

Today `/admin/verifications` (`AdminVerifications.tsx`) lists only pending **renter** profiles, but the user expects the verifications surface tied to business clients to show **business** verification requests.

- Keep `/admin/verifications` (renter ID verifications) as-is — this is the renter-side surface.
- Surface **business verifications** through:
  - A "Pending business verifications" pill/count at the top of the **Business Clients** tab (already partly there) that filters the table to pending ones, AND
  - The new "Verification" tab inside `AdminBusinessDetails` (full review + approve/reject UI moved/duplicated from `AdminAgencyVerifications.tsx`).
- `AdminAgencyVerifications.tsx` (the standalone bulk page) stays available at `/admin/agencies/verifications` as a queue view, but each row's "Open" action now navigates to `/admin/business/:id` (Verification tab) instead of opening its inline dialog. This makes business verification reviews live inside the new business detail page, fully separated from renter verifications.

### 4. Data sources (no schema changes)

All data comes from existing tables — no migrations needed:
- `profiles` (user_type='business', business_type)
- `agencies` (business profile + verification_status + suspended_*)
- `business_application_documents` (verification docs)
- `bike_types` (fleet)
- `bookings` (where assigned_to_business = user_id)
- `agency_wallets`, `agency_wallet_transactions`, `agency_subscriptions`, `agency_withdrawal_requests`
- `client_files`, `client_timeline_events` (reused, scoped by user_id)

Existing RLS already grants admins full read access to all of these.

## Out of scope (explicitly NOT changing)

- Renter `AdminClientDetails` page — untouched
- `AdminUnifiedClientsTab` (renter list) — untouched
- Bike re-verification flow, lifecycle triggers, public visibility logic — untouched
- Renter-side UI, public/renter pages — untouched
- Agency-side wizard / dashboards — untouched
- Database schema, RLS, triggers — untouched

## Files

**Create**
- `src/pages/admin/AdminBusinessDetails.tsx`
- `src/components/admin/business-details/` (BusinessHeaderSection, BusinessOverviewTab, BusinessVerificationTab, BusinessFleetTab, BusinessBookingsTab, BusinessWalletTab, BusinessNotesFilesTab, BusinessTimelineTab, index.ts, types.ts)
- `src/hooks/useBusinessDetails.ts`

**Edit**
- `src/App.tsx` — add `/admin/business/:id` route
- `src/components/admin/AdminBusinessClientsTab.tsx` — re-route view buttons to `/admin/business/:id`
- `src/pages/admin/AdminAgencyVerifications.tsx` — row action navigates to `/admin/business/:id` (Verification tab) instead of inline dialog (keep dialog as fallback if you prefer; will confirm during implementation)

## QA after implementation

- Renter row → still opens existing `/admin/clients/:id` (unchanged UI).
- Business row → opens new `/admin/business/:id` with business-only tabs and no trust score.
- Verification tab inside business details shows uploaded docs and lets admin approve/reject; renter `/admin/verifications` no longer mixes business cases.
- "Open Agency Dashboard" opens the agency view for that business.
- All actions respect existing RLS (no new policies).

Awaiting approval before switching to build mode.
