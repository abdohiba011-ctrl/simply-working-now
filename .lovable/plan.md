Three independent improvements. All UI/frontend only — no schema changes.

## 1. Hero "Select a city" dropdown — drop the "Available" badge

**File:** `src/components/HeroSection.tsx` (lines ~310–340)

Available cities currently render with a green "● Available" pill. It's redundant — being in the active list already implies availability. Remove the pill so the row shows just the city name. Coming-soon cities keep their grey "🕒 Soon" badge unchanged.

```text
Casablanca
Marrakech
Rabat
Agadir       🕒 SOON   (disabled)
Chefchaouen  🕒 SOON   (disabled)
```

## 2. Mobile header — messages icon next to the hamburger

**File:** `src/components/Header.tsx` (around line 552, the `md:hidden` mobile menu button)

Add a `MessageCircle` icon button immediately to the left of the hamburger, only visible on mobile (`md:hidden`) and only when the user is authenticated. Tapping it routes to `/inbox`. Reuse the existing `unreadMessages` state already in `Header.tsx` to show the red badge in the same style as the desktop one. If not authenticated, the icon is hidden.

## 3. Verification gate inside the chat (after payment)

**File:** `src/components/chat/ChatThread.tsx` (the existing amber `showVerifyBanner` block, lines ~354–381, plus the composer at lines ~555–600)

Today an unverified renter sees a soft dismissible banner and can still send messages. Replace this with a hard gate.

### Behavior

When `viewerRole === "renter"` and the renter's `verification_status` is **not** `verified`/`approved`:

- **Status `not_started` or `rejected`** → Replace the message composer with a CTA card:  
  *"You're one step away from chatting with the agency. Verify your account to unlock messaging."*  
  Primary button: **Verify my account** → opens a verification modal (see below). Existing messages above stay readable.

- **Status `pending_review`** → Replace the composer with a waiting card:  
  *"Your account is under review. An admin will verify it within 5 minutes – 24 hours. You'll be able to chat with the agency right after."*  
  No button. Shows a soft pulse / clock icon.

- **Status `verified` / `approved`** → Composer behaves as today.

Remove the dismissible amber banner and the `verifyBannerDismissed` sessionStorage logic — the gate replaces it.

### Verification modal (responsive)

New component: `src/components/verification/VerificationDialog.tsx`

Built on existing shadcn primitives:
- **Desktop / tablet (`md` and up)** → use `Dialog` (centered modal, max-w-2xl).
- **Mobile (< `md`)** → use `Sheet` with `side="bottom"`, rounded top corners, `h-[92dvh]`, grab handle. Same content inside.

Two internal steps managed by local state:
1. **Form step** — embed the existing verification form fields (ID upload, license, phone, name on ID, etc.). Reuse the same submission logic from `src/pages/Verification.tsx` so we don't duplicate validation. Easiest path: extract the form body of `Verification.tsx` into a shared `<VerificationForm onSubmitted={...} />` component and import it both there and in the dialog. On successful submit (`verification_status` set to `pending_review`), call `onSubmitted()`.
2. **Success step** — full-pane success state inside the same dialog/sheet:  
   ✅ *"Thanks! Your documents are submitted."*  
   *"An admin will review within 5 minutes – 24 hours. We'll notify you the moment it's approved."*  
   Single button: **Back to messages** → closes the dialog.

After the dialog closes, `ChatThread.tsx` re-reads the renter's `verification_status` (already wired in the existing effect at lines 104–125 — just re-trigger it) so the chat now shows the `pending_review` waiting state.

### Realtime auto-unblock (nice-to-have, in scope)

Subscribe to `postgres_changes` on `profiles` for the renter's row inside `ChatThread.tsx`. When `verification_status` flips to `verified`, the gate automatically lifts and the composer appears — no refresh needed.

## Out of scope

- No changes to admin-side verification approval flow (already exists at `/admin/agency-verifications` etc.).
- No DB migrations.
- No translations added in this pass — copy lands in English; can wire i18n keys after layout is approved.
