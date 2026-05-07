# Plan

Three small, scoped UI/UX fixes across the agency dashboard. No business logic or schema changes.

---

## 1. Mark messages as read when a conversation is opened

**Symptom:** Sidebar/list badge keeps showing the unread count even after the user opens the conversation and visibly sees the new messages.

**Root cause:** `ChatThread` runs the "mark as read" effect on every change to the `messages` array. But:
- The update is fire-and-forget (no `await`, no error handling), so failures pass silently.
- After the optimistic local update fires, `messages` still contains old `read_at = null` values until realtime echoes back, so the effect re-runs and re-issues the same UPDATE — and if RLS rejects it once, it keeps rejecting.
- The agency `Messages.tsx` and renter `Inbox.tsx` rely on the realtime UPDATE event reaching the badge hook to refresh. If the UPDATE never lands (RLS or the row already matched), the badge never refreshes.

**Fix (frontend only):**
- In `src/components/chat/ChatThread.tsx`:
  - When the active booking opens, run a single explicit "mark read" call scoped to that booking: `update booking_messages set read_at = now() where booking_id = ? and sender_id <> me and read_at is null`. This is idempotent and only fires once per booking open + once when new inbound messages arrive.
  - After the update succeeds, manually call a passed-in `onRead?: () => void` callback so parents (Inbox, agency Messages) can refresh their list/badge immediately, without waiting for realtime.
  - Track which message IDs we have already attempted to mark, to avoid the re-fire loop.
- In `src/pages/agency/Messages.tsx` and `src/pages/Inbox.tsx`:
  - Pass `onRead={load}` to `ChatThread` so the conversation list re-renders with the cleared unread pill the moment the chat is opened.
- In `src/hooks/useAgencyBadges.ts`:
  - Already listens to `booking_messages` `*` events. Confirm it refreshes on the UPDATE; if not, expose the same `refresh` and call it from `Messages.tsx` after `onRead` fires (cheap and guaranteed).

**Out of scope:** server-side RPC, RLS changes, renter-side badge hook (renter inbox already shows correct counts via reload).

---

## 2. Polish typography on Agency → Help & Support

**Symptom:** "Frequently asked questions", "Video tutorials", "What's new" headings render very large and feel out of proportion vs. the rest of the agency dashboard (see screenshot).

**Fix (`src/pages/agency/Help.tsx` only):**
- Page title `h1`: drop from `text-3xl` to `text-2xl font-semibold tracking-tight` to match the rest of the agency dashboard (Dashboard, Motorbikes, Bookings all use `text-2xl`).
- Section headings inside cards (`Frequently asked questions`, `Video tutorials`, `What's new`, "Contact support"): standardize to `text-base font-semibold` (currently inconsistent and oversized).
- Search input: drop from `h-12 text-base` to `h-10 text-sm` to match other agency search inputs.
- FAQ accordion question text: cap at `text-sm font-medium` so they don't read like H2s.
- Card padding: keep `p-5` but add `space-y-3` consistently inside.

No copy changes, no layout restructure.

---

## 3. Agency → Motorbikes: single-line toolbar + 4-column grid

**Symptom:** Title + count, search, view switcher, "Add motorbike", and the Active/Archived tabs are split across two rows. User wants everything on one line. Also wants 4 cards per row instead of 3 on large screens.

**Fix (`src/pages/agency/Motorbikes.tsx` only):**

Toolbar restructure — collapse the two existing flex blocks (header row + tabs row) into a single responsive row:

```text
[ Motorbikes  · 12 in fleet ]   [ Active | Archived ]   [ 🔍 search ]  [ Grid | Table ]  [ + Add motorbike ]
```

- Wrap everything in one `flex flex-wrap items-center gap-3` (or `lg:flex-nowrap` so it stays one line at ≥1024px and wraps gracefully below).
- Title block: `Motorbikes` as `text-xl font-semibold` + the count rendered inline as a muted pill (`12 in fleet` / `3 archived`) instead of as a subtitle on its own line. This shrinks vertical space and matches the requested "all in one line" format.
- Move the Active/Archived segmented control next to the title so the page identity sits on the left.
- Right side keeps: search input (narrower, `w-56`), Grid/Table toggle, primary "Add motorbike" button.
- Below 1024px: items wrap into 2 lines naturally; on mobile the search expands full-width.

Grid density:
- Change grid classes from `sm:grid-cols-2 lg:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4`.
- Confirms 4-up at common desktop widths (≥1280px) per user request, while staying readable on smaller laptops.
- Card padding/internals untouched.

No data, no routing, no wizard changes.

---

## Files touched

- `src/components/chat/ChatThread.tsx` — explicit mark-read + onRead callback
- `src/pages/Inbox.tsx` — pass onRead
- `src/pages/agency/Messages.tsx` — pass onRead
- `src/pages/agency/Help.tsx` — typography pass
- `src/pages/agency/Motorbikes.tsx` — single-line toolbar, 4-column grid

No DB migrations, no edge functions, no i18n strings added (existing labels reused).
