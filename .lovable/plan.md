## Goal
Reclaim vertical space on the renter Messages page by removing the slim top header. Move the back icon into the conversation list panel, drop the duplicate "Messages" title, drop the logo, and add a compact language switcher icon.

## Changes — `src/pages/Inbox.tsx`

**Remove**
- The entire top bar block (lines ~177–193): the sticky `h-14` strip with back button, "Messages" title, and Motonita logo.
- The `motonita-logo.svg` import — no longer used.
- The redundant subtitle "Your booking conversations" (the page is self-evident now).

**Restructure the conversation list header** (currently lines ~207–212)

New layout, single row, compact (~`py-3.5`):
```
[← back]  Messages              [🌐 lang]
```
- Left: round `ChevronLeft` button (reuse existing `handleBack`) — same styling as before (`h-9 w-9 rounded-full bg-muted/70`).
- Center/left-after: single `<h1>Messages</h1>` (the only occurrence on the page).
- Right: language switcher — small ghost button using the `Globe` lucide icon, opens a `DropdownMenu` with FR / EN / AR options wired to `useLanguageStore().setLanguage`. Use the existing flag icons (`FrFlag`, `GbFlag`, `MaFlag`) inside the menu items, mirroring the pattern in `src/components/agency/Header.tsx`.

**Outer container**
- Drop the now-unused outer flex column wrapper's top-bar slot. Keep `min-h-[100dvh]`, `bg-muted/30`, and the `max-w-6xl` rounded card shell. The card now starts at the very top of the viewport (with the existing `md:my-4` breathing room on desktop).

**Mobile behavior** (when a conversation is open and list is hidden)
- The chat pane already has its own header with a back arrow inside `ChatThread`, so removing the outer top bar does not strand the user.

## Out of scope
- No changes to `ChatThread.tsx`, agency Messages, routing, or i18n setup.
- No business logic, data fetching, or RLS changes.

## Files touched
- `src/pages/Inbox.tsx` (only)
