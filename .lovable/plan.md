## Issues to fix

You walked through: home → "More" → Agencies → "Sign up" → landed on `/agency/signup`. Three real problems:

1. **Wrong logo on dark mode.** The auth page (`AuthLayout`) imports the *light-mode* logo (`motonita-logo.svg`, dark text) and shows it even when the app is in dark mode, so it disappears against the dark background.
2. **App defaults to dark mode** when the visitor's OS is set to dark. You want light mode as the default for new visitors — only switch to dark if the user explicitly chooses it.
3. **Signup page styling looks off** in dark mode — the card uses hardcoded light colors (`bg-white`, `#163300` text, `rgba(22,51,0,...)` borders), so in dark mode it renders as a light card with poor contrast around it.

Side note on "mock authenticator": the Google button is real (Lovable Cloud OAuth). The "Sign up with Google" label currently reads fine — no "Business" suffix is rendered. If you saw that wording, it was the previous translation. We'll double-check the label says just "Sign up with Google".

## Changes

### 1. Default theme = light (always)
`src/hooks/useTheme.ts`
- Remove the `prefers-color-scheme: dark` system check.
- New visitors → `light`. Only `localStorage` overrides.

### 2. Auth layout uses theme-aware logo
`src/components/auth/AuthLayout.tsx`
- Import both `motonita-logo.svg` and `motonita-logo-dark.svg`.
- Use `useTheme()` to pick the correct one (same pattern as `Header.tsx`, `Sidebar.tsx`).

### 3. Auth pages adapt to dark mode
`src/components/auth/AuthLayout.tsx` + `src/pages/auth/Signup.tsx` + `src/pages/auth/Login.tsx`
- Replace hardcoded colors with semantic tokens:
  - `bg-white` on dividers → `bg-card`
  - `style={{ color: "#163300" }}` → `text-foreground`
  - `style={{ color: "rgba(22,51,0,0.7)" }}` → `text-muted-foreground`
  - `borderColor: "rgba(22,51,0,0.08/0.10)"` → `border-border`
- Keep the lime accent pill (#9FE870) since it's brand and works on both themes.

### 4. Confirm Google button label
`src/pages/auth/Signup.tsx`
- Verify label resolves to "Sign up with Google" (no "Business" suffix). Both translation keys already fall back to "Sign up with Google" — leave as-is.

## Out of scope
- Header "More → Agencies" navigation works as-is.
- The Google sign-in flow itself is untouched (it's the real Lovable Cloud OAuth, not a mock).

## Files touched
- `src/hooks/useTheme.ts` — drop system-preference branch
- `src/components/auth/AuthLayout.tsx` — theme-aware logo + semantic colors
- `src/pages/auth/Signup.tsx` — semantic colors throughout
- `src/pages/auth/Login.tsx` — semantic colors throughout
