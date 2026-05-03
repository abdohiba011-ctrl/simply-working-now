## Goal

Make agency-side motorbike management feel like one continuous flow:

1. **Add Motorbike** opens as a modal/pop-up (not a separate page).
2. **Motorbike Detail** shows every field the agency entered (currently most are hidden).
3. **Edit** opens the same modal pre-filled with the bike's data.
4. **Admin Bike Review** displays the same complete picture so verification is based on real data.

No business-logic changes — only UI surface + a couple of small alignments on the admin side.

---

## What changes

### 1. Wizard becomes a modal (`MotorbikeWizardDialog`)

- New component: `src/components/agency/MotorbikeWizardDialog.tsx`
  - Wraps the existing 5-step wizard body in a `Dialog` (`max-w-3xl`, scrollable content, sticky footer with Back / Next / Save).
  - Props: `open`, `onOpenChange`, `bikeId?` (undefined = create, string = edit), `onSaved(id)`.
  - Reuses the existing wizard logic by extracting the body of `MotorbikeWizard.tsx` into a shared `MotorbikeWizardForm` (same state, same save flow, same toasts, same re-verification rules — nothing about the bike lifecycle changes).
- `MotorbikeWizard.tsx` (page route) is kept as a thin fallback that renders the form inside `AgencyLayout`, so deep links like `/agency/motorbikes/:id/edit` and `/agency/motorbikes/new` still work (used by emails/notifications).

### 2. Triggers from "Add motorbike" / "Edit"

Update these to open the dialog instead of navigating:
- `src/pages/agency/Motorbikes.tsx`
  - "Add motorbike" button (header + empty-state) → `setOpen(true)` with no `bikeId`.
  - Table/Grid "Edit" → `setOpen(true)` with that bike's id.
- `src/pages/agency/MotorbikeDetail.tsx`
  - Top "Edit" button and "Edit and resubmit for review" button → open the dialog with current id.
- `src/pages/agency/Dashboard.tsx`
  - "Add motorbike" quick action → open the dialog (lifted state via a small `useDisclosure` hook or local state).

After save, the dialog calls `onSaved(id)` which refreshes the list (`refresh()` from `useAgencyBikes`) or re-fetches the detail page (`useAgencyBike` already realtime).

### 3. Motorbike Detail — show everything

`src/pages/agency/MotorbikeDetail.tsx` keeps its current header, gallery, status banners, availability switch, archive flow. Below those, add read-only sections that mirror the wizard exactly (same labels, same icons, same `bikeFeatures` lookups used by `AdminBikeReview`):

- **Basic info** — name, brand, model, year, color, category
- **Specifications** — engine cc, fuel, transmission, mileage, license required, min age, min experience
- **What's included** — helmets count, helmet included flag, full feature chips
- **Pricing & policies** — daily price, deposit, min/max rental days, cancellation policy (full title + description from `CANCELLATION_OPTIONS`)
- **Description** — full text (already present, kept)
- **Pickup location** — already present, kept

Empty values render as a muted "—" (same `Field` helper pattern as the admin review page).

### 4. Admin Bike Review — fill the gaps

`src/pages/admin/AdminBikeReview.tsx` already mirrors the wizard. Small alignments only so admin sees exactly what the agency entered:

- Show **bike-specific pickup** (`bike.city_id` → service_cities name, `bike.neighborhood`) in addition to the agency fallback.
- Show **weekly_price / monthly_price** if set (currently hidden).
- Show **helmet_included** flag alongside the helmets count.

No new tables, no schema changes.

---

## Files touched

- **new** `src/components/agency/MotorbikeWizardDialog.tsx`
- **new** `src/components/agency/MotorbikeWizardForm.tsx` (extracted body)
- **edit** `src/pages/agency/MotorbikeWizard.tsx` (now just renders the form inside `AgencyLayout`)
- **edit** `src/pages/agency/Motorbikes.tsx` (open modal instead of navigating)
- **edit** `src/pages/agency/MotorbikeDetail.tsx` (modal trigger + full read-only sections)
- **edit** `src/pages/agency/Dashboard.tsx` (modal trigger from quick action)
- **edit** `src/pages/admin/AdminBikeReview.tsx` (pickup, weekly/monthly, helmet_included)

## Out of scope (not touched)

- Bike lifecycle, re-verification triggers, RPCs, RLS, status rules.
- Public renter UI (`BikeDetails`, `BikeCard`).
- Mobile layout of the admin review page.
- Trigger consolidation.
- Translations beyond reusing existing keys (the new sections use the same labels already shipped via `bikeFeatures.ts`).

---

## QA after implementation

- Add motorbike from Motorbikes page → modal opens, 5 steps work, save closes modal, list refreshes.
- Edit existing approved bike → modal opens pre-filled; price-only edit stays live; spec/photo edits flip to pending (unchanged behavior).
- Detail page now shows every field that was entered, with "—" for empty ones.
- Deep link `/agency/motorbikes/:id/edit` still loads the page version of the wizard.
- Admin review page shows bike-level pickup when set, weekly/monthly price when set, helmet-included flag.