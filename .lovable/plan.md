## Goal

Make the agency signup city dropdown reflect exactly what the admin manages in `service_cities`: show available cities as selectable, and coming-soon cities as visible but disabled with a "Coming soon" label. Remove the hardcoded city list so the admin is the single source of truth.

## Current State

- `SignupExtra.tsx` merges DB cities with a hardcoded `CITIES` array (Casablanca, Marrakech, Rabat, Tangier... Other). This is why the dropdown shows duplicates ("Marrakesh" + "Marrakech") and cities that the admin marked unavailable.
- `useServiceCities.ts` filters out `is_available === false`, so coming-soon cities never reach the UI.
- Admin DB currently has 3 available (Casablanca, Marrakesh, Rabat) and 5 coming-soon (Fes, Tangier, Agadir, Essaouira, Chefchaouen).

## Changes

### 1. `src/hooks/useServiceCities.ts`
- Stop filtering out unavailable cities. Return `is_available` and `is_coming_soon` flags on each city.
- Keep neighborhood filtering by `is_active`.

```ts
export interface ServiceCityOption {
  id: string;
  name: string;
  is_available: boolean;
  is_coming_soon: boolean;
}
```

### 2. `src/pages/auth/SignupExtra.tsx`
- Delete the hardcoded `CITIES` array and the merge logic (`cityList`).
- Render dropdown directly from `dbCities` ordered by `display_order` (already done by hook).
- For coming-soon cities: render `<SelectItem disabled>` with the label `"<City> — Coming soon"` (translated).
- Selecting an available city continues to populate neighborhoods from `service_locations`.
- Show a subtle helper line under the dropdown: "We currently operate in {N} cities. More coming soon."

### 3. `src/pages/auth/Signup.tsx`
- Same treatment if it has a city dropdown (verify and apply same pattern: DB-driven, coming-soon disabled).

### 4. i18n strings
Add to `en.json`, `fr.json`, `ar.json` under `mockAuth`:
- `coming_soon_suffix`: "Coming soon" / "Bientôt disponible" / "قريبًا"
- `cities_helper`: "We currently operate in {{count}} cities. More coming soon." (+ FR/AR)

## Admin Linkage

No admin code changes needed — admin already writes to `service_cities` with `is_available` / `is_coming_soon`. Once this hook stops filtering, every change in the admin panel (toggle availability, add a city, mark coming-soon) propagates to the agency signup dropdown immediately on next page load.

## Out of Scope

- No DB schema changes.
- Renter-side city selectors and `TopCitiesSection` already respect these flags — untouched.
- No realtime subscription on the signup page (one-shot fetch is enough for a signup form).
