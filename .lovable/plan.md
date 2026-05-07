## Goal
On the renter `/inbox` page, the conversation list + chat currently stretch edge‑to‑edge on large desktops, which makes message bubbles span the full screen and feel unprofessional. Add proper max‑width breakpoints and refine the chat surface so it looks like a polished messenger (Linear / WhatsApp Web / Wise style).

## Scope
Frontend / presentation only. No schema, no business logic, no realtime changes.

Files to edit:
- `src/pages/Inbox.tsx` — wrap the two‑pane layout in a centered, max‑width container with side gutters on `xl`/`2xl` screens.
- `src/components/chat/ChatThread.tsx` — tighten the message column (cap bubble row width), refine spacing, header and composer paddings.

## Layout rules

```text
< 768px   : full‑width single pane (list OR chat) — unchanged mobile behavior
768–1279  : list 320px + chat fills remaining, full width
1280–1535 : centered shell, max‑w 1200px, list 340px
≥ 1536    : centered shell, max‑w 1360px, list 360px, soft side gutters
```

Inside the chat pane:
- Messages scroll area gets an inner `max-w-[760px] mx-auto` wrapper so bubbles never span the entire desktop width.
- Bubbles capped at `max-w-[68%]` (down from current full‑width feel).
- Header and composer share the same inner max‑width so everything aligns.

## Visual polish
- Soft neutral chat background (`bg-muted/30`) instead of the hard `#FAFAFA`.
- Add a subtle top shadow under the chat header on scroll.
- Date separators centered with thin divider lines on each side.
- Message bubbles: `rounded-2xl`, `px-3.5 py-2`, slightly tighter line‑height, time chip moved inside the bubble bottom‑right (muted).
- Conversation list rows: increase vertical rhythm slightly, add a 2px left accent bar on the active row in primary color, and make the unread dot a solid pill consistent with the rest of the app.
- Empty‑state ("Select a conversation") gets a slightly larger icon and a softer copy block.

## Out of scope
- Agency dashboard messages page (separate route).
- Any change to message sending, attachments, read‑receipts, or hooks.
- Translations / i18n keys (no new strings introduced).
