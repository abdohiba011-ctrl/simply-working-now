## Goal
Give renters a dedicated **Messages** entry in the public header (like the profile icon) that opens a chat-style inbox modeled on the agency `Messages` page (left list of conversations, right-side chat panel).

## Changes

### 1. Header — add Messages icon (`src/components/Header.tsx`)
- Add a new icon button (`MessageCircle` from lucide-react) placed **next to the avatar** on desktop (and inside the mobile menu under "Notifications").
- Visible only when `isAuthenticated`.
- Clicking navigates to `/inbox`.
- Show a red unread badge driven by a new count of unread `booking_messages` where the user is the booking's `user_id` and `sender_id !== user.id` and `read_at IS NULL`.
- Polling: piggyback on the existing 30s `fetchUnreadNotifications` interval — add a `fetchUnreadMessages` call alongside it, plus a realtime subscription on `booking_messages` INSERTs to bump the count immediately (and play the existing notification sound).
- Add an i18n key `header.messages` in `en/fr/ar` translations (`src/locales/translations.ts` + JSON files).

### 2. Inbox page — redesign as chat (`src/pages/Inbox.tsx`)
Replace the current "list that links to /booking/:id" with the **same two-pane layout as `src/pages/agency/Messages.tsx`**:
- **Left pane**: list of the user's bookings that have a chat (sorted by latest message, then pickup date), each card shows bike name, dates, status, unread badge, last message preview.
- **Right pane**: `<BookingChat bookingId={activeId} viewerRole="renter" title="Chat with agency" />`.
- On mobile (`< md`): show only the list; tapping a conversation swaps to a full-width chat view with a back button (so it's usable at 375px).
- Auto-select the most recent conversation on load (desktop only).
- Mark messages as read: when a conversation is opened, update `booking_messages.read_at = now()` for messages where `sender_id !== user.id AND read_at IS NULL AND booking_id = activeId` (RLS already permits booking parties to UPDATE — confirmed in the existing realtime UPDATE handler in `useBookingMessages`). If the existing UPDATE policy on `booking_messages` only covers admins, we'll add a migration allowing booking participants to update only the `read_at` column on messages they didn't send.
- Keep realtime refresh on new INSERTs (already implemented).

### 3. RLS check (only if needed)
Looking at current policies on `booking_messages`: SELECT and INSERT for booking parties exist, but **no UPDATE policy** for participants. If we want renters to mark messages read, add a migration:
```sql
CREATE POLICY "Booking parties can mark messages read"
ON public.booking_messages FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.id = booking_messages.booking_id
    AND (b.user_id = auth.uid() OR b.assigned_to_business = auth.uid())
))
WITH CHECK (...same...);
```
Plus a trigger to ensure non-admin updates can only change `read_at` (prevents tampering with `body`/`flagged`).

### 4. No changes to
- `BookingChat.tsx` (already supports `viewerRole="renter"`).
- `useBookingMessages.ts` (already handles realtime).
- Agency-side Messages (unchanged — this is the visual reference).

## Files touched
- `src/components/Header.tsx` — add Messages icon + unread polling
- `src/pages/Inbox.tsx` — rewrite to two-pane chat layout
- `src/locales/translations.ts`, `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ar.json` — `header.messages` key
- New migration: `booking_messages` UPDATE policy + read-only-`read_at` trigger for participants

## QA
- Logged-in renter sees a new chat icon in header with unread badge.
- Click → `/inbox` shows conversation list + chat pane mirroring agency layout.
- Sending a message from renter side appears instantly in agency `Messages` page (realtime).
- Mobile (375px): list-first then chat-full-screen with back button.
- Anonymous users: header icon hidden.
