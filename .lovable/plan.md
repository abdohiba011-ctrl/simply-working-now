# Fix: Header credits + business label + verify Cities admin

Three fixes — all in the header / i18n layer plus a thorough functional review of the Cities admin tab.

## 1. Credits pill in header keeps appearing/disappearing

**Cause** (`src/components/Header.tsx`, lines 60–83):

```ts
const isRenter =
  rolesReady && isAuthenticated && !isBusiness && (hasRole('renter') || !isAdmin);
```

- `rolesReady` flips false → true on every navigation while roles refetch → the pill mounts/unmounts → "appears, disappears".
- For an admin who doesn't also have the explicit `renter` role, `!isAdmin` is false → pill is hidden entirely.
- The wallet hook (`useRenterWallet`) is also gated, so balance stays at 0 even when shown.

**Fix:**
- Show the credits pill for **any authenticated user** that isn't currently acting as a business/agency, regardless of admin status. Admins and renters both have a renter wallet.
- Cache the previous "should show" decision so a brief `rolesReady=false` window during route changes doesn't unmount the button. Use `useRef` to keep the last truthy value, only hide when we're certain the user is in business mode.
- Same fix applied to the dropdown `Credits · {balance}` row.

## 2. "header.switchToBusiness" raw key showing in the menu

**Cause:**
- `en.json` has `header.switchToBusiness`, but `fr.json` and `ar.json` only define `settings.switchToBusiness` — the `header.switchToBusiness` key is **missing**, so i18next falls back to printing the raw key.
- Beyond that, the label itself is wrong: when the user already has the agency role, clicking that item goes to `/agency/agency-center` — it's not "switch to business", it's "open my agency dashboard".

**Fix:**
- Rename the menu label to a clearer key: `header.openAgencyDashboard` → "Agency Dashboard" / "Tableau de bord agence" / "لوحة تحكم الوكالة".
- Add the new key to all three locale files (`en.json`, `fr.json`, `ar.json`) AND to `src/locales/translations.ts` (so legacy consumers don't break).
- Update `Header.tsx` (desktop dropdown line 530 + mobile menu line 690) to use the new key.

## 3. Verify the Cities admin tab end-to-end

Code review of `src/components/admin/AdminCitiesTab.tsx` shows all CRUD wiring exists:
- Add city, edit city, delete city (blocked when neighborhoods exist) ✅
- Toggle availability, toggle "show on homepage" ✅
- Add / rename / delete neighborhood, toggle popular & active ✅
- `useServiceCitiesRealtime()` is called for live updates ✅
- Renter side reads from `service_cities` / `service_locations` so changes propagate.

I'll do a live functional pass with the browser tool after the code fixes:
1. Open `/admin/panel` → Cities tab.
2. Add a test city ("QA City"), confirm it appears.
3. Expand it, add two neighborhoods, rename one, toggle popular/active.
4. Toggle homepage on/off, toggle availability.
5. Edit the city (name + price).
6. Try deleting with neighborhoods present → should be blocked with the warning dialog.
7. Delete the neighborhoods, then delete the city.
8. Verify the renter homepage/cities section reflects toggles, and agency "city" pickers list the new city.

Any issue found during the live pass → fix in the same loop and re-test.

## Files to change

- `src/components/Header.tsx` — credits pill stability + new menu label key (desktop + mobile)
- `src/locales/en.json` / `fr.json` / `ar.json` — add `header.openAgencyDashboard`
- `src/locales/translations.ts` — same key in all three blocks
- `src/components/admin/AdminCitiesTab.tsx` — only if the live test surfaces a real bug

No database changes needed.
