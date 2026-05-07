## Goal

1. Wherever the agency's avatar appears (sidebar profile card, header, chat thread when renter sees agency), use the logo uploaded in Profile (`profiles.business_logo_url`) instead of just a letter. Fall back to the initial only if no logo is set.
2. Replace the emoji flags (🇫🇷 🇬🇧 🇲🇦) in the language switcher with real SVG flag icons, both in the agency header and on agency login/signup pages.

## Implementation

### A. Shared agency identity hook

Add `useAgencyIdentity()` in `src/hooks/useAgencyData.ts`:
- Reads from `profiles` for the current `userId`: `business_name`, `business_logo_url`, `business_email`.
- Returns `{ name, logoUrl, initial }`.
- Cached in module-level state + refreshes when user changes.

Why: avoids re-fetching the same row in Sidebar, Header, and ChatThread.

### B. Agency avatar component

Create `src/components/agency/AgencyAvatar.tsx`:
- Props: `logoUrl?: string | null`, `name?: string | null`, `size` (`sm` | `md` | `lg`), `className`.
- Renders the shadcn `Avatar` with `AvatarImage` when `logoUrl` is set, else `AvatarFallback` with the initial.

### C. Wire it in

- `src/components/agency/Sidebar.tsx` — replace the lines 144-166 "footer profile card" letter circle with `<AgencyAvatar size="md" />`. Show `business_name` (fallback to email-prefix) instead of the email-prefix when set.
- `src/components/agency/Header.tsx` — there is no avatar in the header today; add `<AgencyAvatar size="sm" />` button on the far right (after Help) that links to `/agency/agency-center#profile`.
- `src/components/chat/ChatThread.tsx` — when `viewerRole === "renter"`, fetch the counterparty agency's `business_logo_url` (passed in as a new optional prop `counterpartyAvatarUrl?: string`) and render it in the header avatar + message bubbles. Update `src/pages/Inbox.tsx` (renter side) to pass that URL. Agency-side (`src/pages/agency/Messages.tsx`) is unchanged because the counterparty there is the renter.

### D. SVG flag icons

Add a tiny flag set in `src/components/icons/flags/`:
- `FrFlag.tsx`, `GbFlag.tsx`, `MaFlag.tsx` — small inline SVG components (~20×14), each rendering an accurate flag (FR three vertical bands, GB Union Jack, MA red field with green pentagram). No external library needed.

Update the `LANGS` array in `src/components/agency/Header.tsx` to use icon components instead of emoji strings, and render `<currentLang.Icon />` in the trigger and dropdown items.

### E. Auth pages language switcher

Check `src/components/auth/AgencyAuthLayout.tsx`. If it currently has no language switcher, add a small dropdown in the top-right of that layout reusing the same flag icons + `useLanguageStore`. If it already shows emoji flags, replace them with the new icon components.

## Files touched

- `src/hooks/useAgencyData.ts` (add `useAgencyIdentity`)
- `src/components/agency/AgencyAvatar.tsx` (new)
- `src/components/agency/Sidebar.tsx`
- `src/components/agency/Header.tsx`
- `src/components/chat/ChatThread.tsx`
- `src/pages/Inbox.tsx` (pass agency avatar URL to ChatThread)
- `src/components/icons/flags/FrFlag.tsx` (new)
- `src/components/icons/flags/GbFlag.tsx` (new)
- `src/components/icons/flags/MaFlag.tsx` (new)
- `src/components/auth/AgencyAuthLayout.tsx` (flag icons / add switcher if missing)

No DB changes, no new buckets — `business_logo_url` already exists and `LogoUploader` already populates it.
