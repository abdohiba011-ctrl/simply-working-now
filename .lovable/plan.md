
# Motonita — Listings, Detail, Booking, Chat & Seed Data

**Locked decision:** Use a **mock YouCan Pay button** for the 10 MAD booking fee in this build (fast QA). Real YouCan Pay sandbox stays wired in code but is bypassed by a "Simulate paid (10 MAD)" dev button so the entire booking → confirmation → chat flow can be exercised end-to-end without leaving the preview.

---

## Phase 1 — Database schema (migrations)

### New tables

**`bike_holds`** — 5-minute soft-lock for concurrency
- `id uuid pk default gen_random_uuid()`
- `bike_id uuid not null` → bikes.id
- `user_id uuid not null` → auth.users.id
- `pickup_date date not null`
- `return_date date not null`
- `expires_at timestamptz not null default now() + interval '5 minutes'`
- `created_at timestamptz default now()`
- Index on `(bike_id, expires_at)` for overlap checks
- RLS: user can `insert/select/delete own`; admin all

**`bike_reviews`**
- `id, bike_type_id, user_id, rating (1-5), comment, reviewer_name, created_at`
- RLS: anyone select; authenticated insert own; admin all

**`booking_messages`** — chat between renter & assigned agency
- `id, booking_id, sender_id, sender_role ('renter'|'agency'|'system'), body, created_at, read_at`
- RLS: only `bookings.user_id` or `bookings.assigned_to_business` (or admin) can select/insert for that booking
- Realtime enabled

### Schema additions to `bike_types`
- `category text` (Standard, Scooter, Sport, Electric, …)
- `weekly_price numeric`, `monthly_price numeric`
- `deposit_amount numeric default 0`
- `license_required text` (none, A1, A, B)
- `min_age int default 18`
- `min_experience_years int default 0`
- `neighborhood text` (free-text for now: Bouskoura, Anfa, …)
- `agency_id uuid` (= owner_id alias for clarity, NOT a new FK)

### Soft-lock helper RPC
`create_bike_hold(_bike_id, _pickup, _return)` — security definer:
1. Cleans expired holds for that bike.
2. Rejects if a confirmed booking OR a non-expired hold (other user) overlaps.
3. Inserts hold for `auth.uid()`, returns hold id + expires_at.

`promote_hold_to_booking(_hold_id, …)` — converts hold → bookings row in a single transaction.

---

## Phase 2 — Seed data (edge function `seed-casablanca-fleet`)

Idempotent, admin-invocable. Uses `SUPABASE_SERVICE_ROLE_KEY`.

1. Locate user `abdrahimbamouh56@gmail.com` (skip with friendly error if not present — owner already exists per audit).
2. Upsert profile fields: `business_name='Casa Moto Rent'`, `business_address`, `business_phone`, `is_verified=true`, `subscription_plan='pro'`, `user_type='agency'`.
3. Ensure `user_roles` has `business` (and `user`) for that owner.
4. Ensure Casablanca city + Bouskoura location exist.
5. Upsert 6 `bike_types` rows (matched by `name`) with the **exact** spec (engine, prices, deposit, license, features, description) from the brief; set `owner_id`, `neighborhood='Bouskoura'`, `city_id`.
6. For each bike_type, generate 3 images with **Lovable AI Gateway** (`google/gemini-3.1-flash-image-preview`) using the brief's prompt template; upload to `bike-images` bucket; insert into `bike_type_images` (display_order 0..2). On generation failure, fall back to a curated Unsplash URL list.
7. Insert one `bikes` inventory row per bike_type (location='Bouskoura', available=true).
8. Insert 3 mock `bike_reviews` per bike (mix of 4★/5★, MA + intl names, dates spread −1d..−180d).
9. Recompute `bike_types.rating` + `review_count` from reviews.
10. Return JSON summary `{ agency: {...}, bikes: [{name, image_count, review_count}], status: 'ok' }`.

---

## Phase 3 — City listings page `/rent/:city`

- Route added in `App.tsx`, lazy-loaded. `/rent/casablanca` is the build target.
- New components under `src/components/rent/`:
  - `BikeFilterSidebar.tsx` — 8 collapsible sections (neighborhood radios, duration chips, price range slider 50–1000 MAD, type checkboxes, fuel radio, date range, license, features). Sticky at 280px, mobile drawer (`Sheet`).
  - `BikeCard.tsx` — 16:9 image (lazy below fold), status badge, favorite heart, featured badge, title/category/neighborhood/price/rating/agency-with-verified-check.
  - `BikeListingsHeader.tsx` — breadcrumb, H1, results count, sort dropdown.
  - `EmptyResults.tsx` — illustration + clear filters CTA.
- Page `src/pages/rent/CityListings.tsx`:
  - Reads filters from URL query params (`?neighborhood=Bouskoura&type=...`), debounced 300ms.
  - React Query: `useBikes` extended to filter by neighborhood / category / fuel / price / license / dates (overlap check vs `bookings` + active `bike_holds`).
  - Default selected neighborhood = **Bouskoura**.
  - Skeleton state via existing `BikeTypeSkeleton`.
- i18n keys added to `en/fr/ar`.

## Phase 4 — Bike detail page `/rent/:city/:bikeId` (extends existing `BikeDetails.tsx`)

Refactor the existing `/bike/:id` page and add the SEO-friendly `/rent/:city/:bikeId` route (both resolve to same component):

- Image gallery with thumbnails + lightbox (keyboard arrows, swipe).
- Specs grid (engine, fuel, transmission, year, mileage, seats, license, deposit).
- Features list (✅/⚠️ icons).
- Availability calendar (month view, booked vs available from bookings + holds).
- Requirements section (license, age, experience, deposit).
- Pickup-location static map (Leaflet, no GPS — just a pin on Bouskoura coords).
- Reviews section: avg + breakdown bars + 3 sample + "see all".
- Similar bikes carousel.
- **Sticky right-column booking card** (desktop) / **sticky bottom bar** (mobile) with:
  - Date pickers, auto duration price (with weekly/monthly tier discount).
  - Cost breakdown: rental subtotal, **10 MAD booking fee**, deposit (informational), total upfront = 10 MAD.
  - "Book Now — 10 MAD" CTA.
- "Already booked for these dates" red banner state when overlap detected.

## Phase 5 — Booking flow

### Step 1 — Click "Book Now"
- Calls `create_bike_hold` RPC. Button shows "Securing your bike…" spinner ~500ms.
- Conflict → toast: "Someone else is currently booking this bike. Try again in 5 minutes."
- Success → store `holdId` + `expiresAt` in URL/state.

### Step 2 — Auth gate
- If unauthenticated: modal "Log in to complete your booking" (Login / Signup / Google) — preserves bike + dates via redirect param.
- If unverified email: redirect to `/verify-email?redirect=...`.

### Step 3 — `/booking/review` (rewrites existing `BookingReview.tsx`)
- Booking summary card, editable renter info pre-filled from profile (name/phone/license/ID).
- Yellow notice box: 10 MAD non-refundable / refunded as Motonita Credit if agency fails.
- 3 legal checkboxes — CTA disabled until all 3.
- Hold countdown chip ("Hold expires in 4:32"). If expires, show "Hold expired" + re-create button.

### Step 4 — `/booking/pay` (new lightweight wrapper)
- Mock YouCan Pay UI: amount 10 MAD, payment-method radios (Moroccan Card / Intl Card / Cash Plus), branded mock checkout.
- **Dev-only "Simulate paid (10 MAD)" button** that calls `promote_hold_to_booking` directly + inserts a fake `youcanpay_payments` row with `status='paid'`.
- Real YouCan Pay path stays wired (existing `youcanpay-create-token` edge function) but hidden behind a feature flag for now.

### Step 5 — Success screen
- Full-page checkmark animation, large booking ID.
- "What happens next?" timeline (4 steps).
- Buttons: "Message the agency" → `/messages/:bookingId` · "View my bookings" → `/bookings`.

### Step 6 — Agency confirm/decline (agency dashboard)
- New action buttons on pending bookings in `BusinessBookings.tsx`:
  - **Confirm** → deduct 50 MAD from `agency_wallets` (via RPC) + insert `agency_wallet_transactions` row + flip `bookings.booking_status='confirmed'` + insert system message.
  - **Decline** → refund 10 MAD as Motonita Credit (insert `agency_wallet_transactions` for renter? — actually a **renter credit ledger**: simplest → notification + manual admin refund flag, since credits table is out of scope here. Will mark booking `cancelled` + `cancellation_reason='agency_declined'` and notify renter; full credit table left as TODO).
- 24h SLA: visual countdown only (no cron job in this build).

## Phase 6 — Chat `/messages/:bookingId`
- New page using shadcn primitives + Supabase Realtime channel on `booking_messages`.
- Auto-system message on confirmation: "🎉 Booking confirmed! Please coordinate pickup details. Payment and deposit are handled directly between renter and agency."
- Reused on both renter and agency sides (role detected from booking).
- Sanitize message bodies before render.

## Phase 7 — Concurrency cleanup
- Cron-like cleanup not needed: every `create_bike_hold` call cleans expired holds for that bike. Overlap check against confirmed bookings + active holds is atomic via RPC.

## Phase 8 — i18n + accessibility + mobile
- All new strings into `en.json` / `fr.json` / `ar.json`.
- aria-labels on icon buttons, alt text on every bike image (`{name} — {color}`), focus-visible rings, keyboard navigation in lightbox & filters.
- Filter sidebar → mobile `Sheet`, bike cards 1-col mobile, booking card → bottom bar.

---

## Files to create

- `supabase/migrations/<ts>_listings_booking_chat.sql`
- `supabase/functions/seed-casablanca-fleet/index.ts`
- `src/pages/rent/CityListings.tsx`
- `src/pages/rent/BookingPay.tsx`
- `src/pages/rent/BookingSuccess.tsx`
- `src/pages/rent/BookingChat.tsx`
- `src/components/rent/BikeFilterSidebar.tsx`
- `src/components/rent/BikeCard.tsx`
- `src/components/rent/BikeListingsHeader.tsx`
- `src/components/rent/EmptyResults.tsx`
- `src/components/rent/BookingHoldCountdown.tsx`
- `src/components/rent/SimilarBikes.tsx`
- `src/components/rent/BikeReviews.tsx`
- `src/components/rent/BikeAvailabilityCalendar.tsx`
- `src/hooks/useBikeHold.ts`
- `src/hooks/useBookingMessages.ts`
- `src/hooks/useBikeReviews.ts`

## Files to modify

- `src/App.tsx` — register new routes (`/rent/:city`, `/rent/:city/:bikeId`, `/booking/pay`, `/booking/success`, `/messages/:bookingId`).
- `src/pages/BikeDetails.tsx` — gallery + lightbox + sticky booking card + reviews + similar.
- `src/pages/BookingReview.tsx` — wire hold + 3 checkboxes + countdown.
- `src/hooks/useBikes.ts` — extended filters (category, fuel, neighborhood, price range, license, date overlap).
- `src/pages/business/BusinessBookings.tsx` — Confirm/Decline action buttons.
- `src/locales/en.json` / `fr.json` / `ar.json` — new keys.

---

## Deliverables checklist

1. ✅ `/rent/casablanca` shows 6 Bouskoura bikes with all 8 filter sections functional.
2. ✅ Bike card → detail page with gallery, specs, reviews, similar bikes.
3. ✅ Book Now → soft-lock → auth gate → review → mock pay → success → chat unlocks.
4. ✅ Concurrency: two tabs booking same bike/dates → first wins, second sees the conflict toast.
5. ✅ Casa Moto Rent agency + 6 bikes seeded with AI-generated images (Unsplash fallback).
6. ✅ Agency Confirm/Decline deducts 50 MAD wallet on confirm.
7. ✅ All strings EN/FR/AR; mobile works at 375px.

## Manual TODO for you (after build)
- Top up Casa Moto Rent agency wallet so Confirm doesn't fail wallet check.
- Decide when to flip the mock-pay flag off and use real YouCan Pay sandbox.
- (Out of scope here) Build a `motonita_credits` ledger table for refund-as-credit on agency decline / 24h timeout.

Approve to switch to default mode and execute.
