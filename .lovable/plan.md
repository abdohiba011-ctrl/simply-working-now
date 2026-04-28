## Goal

Make agency verification simple. Only ask for what's actually needed:

1. **Entity type selector** — "Company (SARL/SA)" or "Auto-entrepreneur"
2. **Business document** (one, depending on entity type):
   - Company → upload **RC (Registre de Commerce)**
   - Auto-entrepreneur → upload **Auto-entrepreneur card**
3. **Owner ID card** — both sides:
   - Front of CIN
   - Back of CIN

Remove **ICE certificate**, **RIB / bank account**, and **Insurance certificate** from the flow. They are no longer requested.

## What changes

### `src/pages/agency/Verification.tsx` (rewrite)

- Add a top selector (radio cards) for entity type: `company` | `auto_entrepreneur`. Persisted on the profile so it survives reloads.
- Replace the 4-tile grid with a 3-step checklist tailored to the choice:
  - Step 1 — Business document (label switches based on entity type)
  - Step 2 — Owner ID card (front)
  - Step 3 — Owner ID card (back)
- Each step keeps the same upload UX (PDF/JPG/PNG, 5 MB max, Replace button, signed-URL preview).
- "Submit for review" only enables once all 3 required files are uploaded; it sets `verification_status = 'pending'`.
- Status badge (Verified / Pending / Rejected / Not started) stays as-is.

### Storage / data

- Reuse the existing `client-files` bucket and `client_files` table — no schema migration needed.
- File-name convention encodes the slot so reloads can re-hydrate the UI:
  - `rc-…` (company business doc)
  - `ae_card-…` (auto-entrepreneur business doc)
  - `id_front-…`
  - `id_back-…`
- Entity type stored in `profiles.business_type` (existing column), values `company` or `auto_entrepreneur`.

### Copy

- Brief one-line helper above the steps: "Most reviews take 24–48 hours. Unverified agencies don't appear in renter search results."
- Remove any mention of ICE, RIB, bank account, insurance from this screen.

## Out of scope

- Admin review UI changes (admin still sees whatever files were uploaded under the user, which now happen to be the simpler set).
- No DB migration, no edge functions, no new tables.
- Translations: English copy only for now (matches current state of this page).
