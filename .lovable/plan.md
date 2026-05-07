## Goal
Polish the renter Messages page (`/inbox`) so it feels like a focused, modern messaging app — no global site header, clear hierarchy, generous spacing, soft rounded surfaces, and a clean (invisible) scroll experience.

## Scope
Renter side only:
- `src/pages/Inbox.tsx`
- `src/components/chat/ChatThread.tsx` (cosmetic refinements only)
- `src/index.css` (add a small `.scrollbar-hide` utility class — keeps content scrollable but hides the scrollbar in WebKit/Firefox)

Agency Messages, BookingChat (legacy), and other pages are untouched.

## Changes

### 1. `src/pages/Inbox.tsx` — replace site header with focused chat shell
- Remove `<Header />`.
- Add a slim top bar inside the page:
  - Left: round back button (`ChevronLeft` in a soft circle) → `navigate(-1)` (fallback `/`).
  - Center / left next to it: page title "Messages" (smaller, only shown when no conversation selected on mobile; on desktop always present in the list pane header).
  - Right: small Motonita logo wordmark (using `motonita-logo.svg`) acting as a quiet brand mark / home link.
- Outer layout becomes `min-h-[100dvh]` with a generous max-width container (`max-w-6xl`), `rounded-2xl` card on desktop with `shadow-sm border border-border/60`, and a soft page background (`bg-muted/30`).
- Conversation list:
  - Increase row padding (`px-4 py-3.5`), increase avatar to `h-11 w-11`, use a soft `rounded-xl` hover/active pill instead of full-width borders. Replace per-row borders with thin `divide-y divide-border/40` so rows feel like one continuous surface.
  - Active row: `bg-primary/10 ring-1 ring-primary/20 rounded-xl` (uses brand lime token).
  - Unread badge: keep brand lime, slightly larger (`h-5 min-w-5`), `font-semibold`.
  - List header: "Messages" `text-xl font-semibold`, subtle subtitle ("Your booking conversations"), thin bottom border.
  - Apply `scrollbar-hide` to list scroll area.
- Empty state: bigger icon, friendlier copy, lime-tinted background circle behind the icon.
- Right pane (no conversation selected): centered illustration block with same circle + helpful hint.

### 2. `src/components/chat/ChatThread.tsx` — light cosmetic pass
- Header: increase padding to `px-4 py-3.5`, `bg-card/95 backdrop-blur`, name `text-base font-semibold`.
- Messages scroll container:
  - Background: `bg-[hsl(var(--muted)/0.4)]` for a calmer surface.
  - Add `scrollbar-hide` class so the scrollbar disappears (still scrollable via wheel/touch).
  - Increase vertical gap between messages (`gap-1.5`) and add more breathing room around day separators.
- Bubbles: bump radius to `rounded-2xl` (already used) but soften shadows (`shadow-none`) and tighten the "tail" corner (`rounded-br-md` / `rounded-bl-md`) so corners look more uniformly rounded.
- Composer area: `rounded-2xl` input wrapper with `border border-border/70`, `bg-card`, subtle shadow; send button becomes a circular `rounded-full` brand-colored button.
- Back button on mobile: round soft button matching Inbox header style.

### 3. `src/index.css` — add scrollbar-hide utility
Append a small layer:
```css
@layer utilities {
  .scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
}
```

## Out of scope
- Agency Messages page, real-time logic, data shape, i18n strings.
- No business-logic or routing changes beyond removing `<Header />` on `/inbox`.

## Verification
- Visit `/inbox` → no global Motonita top header; new slim back/logo bar.
- Conversation list scrolls without a visible scrollbar.
- Message thread scrolls without a visible scrollbar.
- Spacing, rounding, and brand-lime accents read as polished and consistent.
- Mobile (375px): list takes full width; opening a conversation hides the list and shows a back arrow inside the chat header.
