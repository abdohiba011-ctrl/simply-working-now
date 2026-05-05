## Renter signup — two fixes

### 1) Make the "I agree to Terms / Privacy" much more prominent

File: `src/pages/auth/Signup.tsx` (renter block around lines 898–924).

Change the current small checkbox row into a **bordered, highlighted callout** that's hard to miss:

- Wrap it in a card-like container: thicker border (`border-2`), tinted background using the brand lime (`bg-primary/10`), rounded corners, generous padding (`p-4`).
- Larger checkbox (use `h-6 w-6` via className on the Radix `Checkbox`).
- Larger, bolder label text (`text-base font-semibold` instead of `text-sm`), with the **Terms of Service** and **Privacy Policy** links underlined and in foreground color so they stand out.
- When unchecked & submitted, the error message becomes large and red right under the box.
- Keep i18n keys (`mockAuth.agree_terms_prefix`, `mockAuth.terms_of_service`, `mockAuth.and`, `mockAuth.privacy_policy`) — only the visual presentation changes.

The "Send me product updates" optional checkbox stays small/muted below — it should visually sit *under* the consent callout, not next to it, so the consent stays the dominant element.

### 2) Auto-login after signup (no manual login step)

The signup store path (`src/stores/useAuthStore.ts`, lines 599–615) already handles the auto-confirmed case by setting `isAuthenticated: true` when `data.session` exists. Auto-confirm is already enabled for this project. The bug is that the renter `onSubmit` in `Signup.tsx` (lines 414–419) **always** navigates to `/verify-email`, even when the user is now signed in.

Fix in `src/pages/auth/Signup.tsx` `onSubmit`:

- After `await signup(...)`, read `useAuthStore.getState()` (or use the already-imported `isAuthenticated` snapshot via `getState`).
- If `isAuthenticated && user` → call `navigateAfterAuth(navigate, user, role)` and show a "Welcome to Motonita" toast. No verify-email detour.
- Only fall back to `navigate('/verify-email?...')` when the session was NOT returned (i.e. confirmation really is required for that account).

This preserves correct behavior for both modes (auto-confirm on or off) and matches the user's expectation: signed-up renters land logged-in, and are only asked to log in again if they explicitly log out later.

### Out of scope

- No changes to the agency signup flow.
- No changes to verify-email page, password rules, or schema.
- No changes to the auth store's signup logic itself — it already supports the auto-login path.