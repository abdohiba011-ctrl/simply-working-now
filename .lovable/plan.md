## What's wrong (verified against the database)

### 1. Homepage shows 6 / city page shows 7 for Casablanca
- `city_bike_counts` view returns **7** for Casablanca (correct).
- `RentCity` query also returns **7** approved active bike_types.
- Both are reading the same underlying data; the "6" the user sees is a **stale render** of the homepage card before realtime refresh kicked in. The "test" bike was just added/approved and the homepage cache was a step behind.
- Real bug: the homepage and city-page query different tables (`city_bike_counts` view vs. raw `bike_types`). They mostly agree, but they can diverge when one bike type has **no available `bikes` unit** — the view excludes it, the city-page query includes it. We need both pages to use the **same visibility rule**.

### 2. "test" bike — agency sees 1 image, public sees 2 (or different image)
Verified in DB:
- `bike_types.main_image_url` = **NULL**
- `bike_type_images` gallery = **1 uploaded image**
- The agency Motorbikes list and detail header use `main_image_url` → shows placeholder.
- Public `BikeDetails` reads the gallery → shows the uploaded image.

Root cause: `MotorbikeWizard` uploads to `bike_type_images` but never writes the first image back to `bike_types.main_image_url`. Result: the two surfaces disagree.

### 3. Agency sidebar order
Currently: Dashboard → Bookings → Motorbikes → Messages → …  
Wanted: Dashboard → **Motorbikes** → **Bookings** → Messages → …

### 4. Archived bikes — no way to view, no delete option
- Agency Motorbikes list filters out archived bikes (correct), but there's **no "Archived" tab/filter**, so once archived a bike disappears entirely from the agency UI.
- There is no hard-delete option. Per locked decision (soft archive only), we should add an **"Unarchive"** action and clearly signal that hard delete is not allowed if bookings exist.

---

## Fix plan

### A. Sync homepage and city-page visibility (consistency)
- Update `RentCity.tsx` query so it matches `city_bike_counts` rule: only return bike_types that **have at least one available, approved, non-archived `bikes` unit**, owner is a verified agency, `archived_at IS NULL`. Use an `EXISTS` filter via a small view or inline filter.
- Result: both pages will always show the same count for the same city.

### B. Keep `main_image_url` in sync with the gallery (`MotorbikeWizard.tsx`)
- After uploading the first gallery image (or whenever the user reorders), set `bike_types.main_image_url` to the first `bike_type_images.image_url`.
- Backfill once for existing rows where `main_image_url IS NULL` but `bike_type_images` has at least one row → migration UPDATE.

### C. Reorder agency sidebar (`src/components/agency/Sidebar.tsx`)
- Swap `Bookings` and `Motorbikes` in the `NAV` array.
- Mirror the same change in `MobileNav.tsx` if it duplicates the order.

### D. Archived bikes UX in the agency dashboard
1. Add a tab/segmented control on `/agency/motorbikes` with two views: **Active** (default) and **Archived**.
2. `useAgencyBikes` hook gets an optional `{ includeArchived?: boolean }` arg. The active view filters `archived_at IS NULL`; the archived view filters `archived_at IS NOT NULL`.
3. On a row in the Archived list, expose:
   - **Unarchive** button → new RPC `unarchive_bike_type(p_bike_type_id)` that clears `archived_at` on the bike_type and its `bikes` units, sets `business_status = 'inactive'` so the agency must explicitly toggle availability back on (no surprise re-publishing).
   - **Delete permanently** button → only enabled when `NOT EXISTS bookings.bike_id IN (SELECT id FROM bikes WHERE bike_type_id = $1)`. Otherwise show a tooltip: "Cannot delete — this bike has booking history. Keep it archived." Implemented as RPC `delete_bike_type_if_safe(p_bike_type_id)`.
4. Keep the existing **Archive** button on the active detail page (already implemented).

### E. Small polish
- On the agency Motorbikes grid + table, fall back to the first `bike_type_images.image_url` when `main_image_url` is NULL, so existing bikes look correct even before the migration runs.

---

## Files to change

- `supabase/migrations/<new>.sql` — backfill `main_image_url`; add `unarchive_bike_type` RPC; add `delete_bike_type_if_safe` RPC.
- `src/pages/RentCity.tsx` — tighten query to match `city_bike_counts`.
- `src/pages/agency/MotorbikeWizard.tsx` — write `main_image_url` after gallery upload / reorder.
- `src/components/agency/Sidebar.tsx` and `src/components/agency/MobileNav.tsx` — reorder nav.
- `src/pages/agency/Motorbikes.tsx` — Active/Archived tabs, fallback image.
- `src/hooks/useAgencyData.ts` — `useAgencyBikes({ includeArchived })`; new mutations for unarchive + delete.
- `src/pages/agency/MotorbikeDetail.tsx` — show Unarchive + Delete-if-safe when viewing an archived bike.

## Risks
- Backfilling `main_image_url` overwrites NULLs only — safe.
- The tighter RentCity query could drop a bike if its `bikes` unit row is missing. Acceptable: that bike was never bookable anyway, and the homepage already hides it. We surface the same truth in both places.
- New RPCs are SECURITY DEFINER and check `owner_id = auth.uid()` (or admin) before mutating.

## QA checklist after fix
- Homepage Casablanca count = `/rent/casablanca` result count.
- Marrakech / Rabat still show 0 and an empty state.
- "test" bike shows the same image on agency list, agency detail, and public bike page.
- Agency sidebar order: Dashboard, Motorbikes, Bookings, Messages, Calendar, Finance, Agency, Settings.
- Archive a bike → it disappears from Active and appears under Archived.
- Unarchive → reappears under Active with `business_status = inactive` (renter cannot see it until agency re-enables availability).
- Delete a bike with no bookings → row is gone permanently.
- Try to delete a bike with bookings → blocked with explanatory toast.
- Arabic RTL: tabs, buttons, sidebar order all mirror correctly.
