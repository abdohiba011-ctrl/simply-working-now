## Goal

Finalize the agency auth rework: silence the missing-translation warnings, then run a full live test of `/agency/signup`, `/agency/login`, and the global radio/checkbox change.

## What changes

### 1. Add `agencyAuth` translation block to all three locale files

Insert a new `"agencyAuth": { ... }` block just before `"mockAuth"` in `src/locales/en.json`, `src/locales/fr.json`, and `src/locales/ar.json`.

**Keys** (all 9):
- `back_to_home`, `email`, `next`, `back`, `brand_name`, `neighborhood`, `step1_subtitle`, `step2_subtitle`, `image_alt`, `tagline`, `tagline_sub`

**English** — keep current `defaultValue` strings.

**French** — example:
- `back_to_home`: "Retour à l'accueil"
- `next`: "Continuer" / `back`: "Retour"
- `brand_name`: "Nom de l'entreprise / marque"
- `neighborhood`: "Quartier"
- `tagline`: "« Frais fixes, zéro commission. Gardez 100 % de chaque location. »"

**Arabic** (RTL) — example:
- `back_to_home`: "العودة إلى الرئيسية"
- `next`: "متابعة" / `back`: "رجوع"
- `brand_name`: "اسم النشاط / العلامة التجارية"
- `neighborhood`: "الحي"
- `tagline`: «رسوم ثابتة، بدون عمولة. احتفظ بـ 100٪ من كل تأجير.»

### 2. Live test in the browser preview

Run through these flows and report findings:

1. **/agency/signup — Step 1**
   - Confirm split layout renders (bike image left, form right).
   - Confirm "Back to home" link, header-style language switcher, stepper at "1/2".
   - Try invalid data → validation errors render.
   - Fill valid data → "Continue" advances to Step 2.

2. **/agency/signup — Step 2**
   - Confirm business name, type, city, neighborhood fields.
   - Pick "Casablanca" → neighborhood becomes a dropdown with the 10 Casablanca neighborhoods.
   - Pick a city not in the map (e.g., "Other") → neighborhood becomes a free-text input.
   - "Back" returns to Step 1 with state preserved.
   - Accept terms checkbox shows the new `rounded-md` style.

3. **/agency/login**
   - Renders in the split layout.
   - Email + password validation works; forgot password link present.

4. **Global radio test** — visit a page with radios (e.g., `/profile` or filters) and confirm they're now square with a check indicator.

5. **Language switcher**
   - Switch to FR → labels translate, no missing-key warnings.
   - Switch to AR → layout flips RTL, image stays on the left visually but logical positioning is correct.

6. **Renter `/signup` and `/login`** — unchanged single-column `AuthLayout`.

Skip the actual "Create account" submit (would create a real Supabase user) — stop at the validation step unless the user explicitly asks.

## Technical notes

- No code changes needed beyond the three locale files.
- After saving locales, the Vite HMR will reload — the `missingKeyHandler` warnings should disappear.

## Files

**Modified**
- `src/locales/en.json` (insert `agencyAuth` block)
- `src/locales/fr.json` (insert `agencyAuth` block)
- `src/locales/ar.json` (insert `agencyAuth` block)

**Untouched**
- All component code already shipped in the previous turn.
