## Goal

Two small changes on the post-payment **booking-confirmed** flow:

1. When the renter clicks **"Message agency"**, automatically open the agency thread **and** drop in a friendly first message on their behalf — so the agency immediately gets a chat to reply to.
2. Update the **"What happens next"** step 2 copy to mention WhatsApp as a notification channel: "You'll be notified by email, in-app message, or WhatsApp."

---

## What changes

### 1. `src/pages/BookingConfirmed.tsx`
- Replace the `<Link to="/inbox">` "Message agency" button with a button that, on click:
  1. Checks `booking_messages` for an existing message from this renter on this booking.
  2. If none exists, inserts a starter message into `booking_messages` with `sender_id = auth.uid()`, `sender_role = 'renter'`, `message_type = 'text'`, and a localized body like:
     > "Hi! I just booked the {bikeName} for {pickup} → {return}. Looking forward to picking it up — could you let me know the next steps and where to meet you? Thanks!"
  3. Navigates to `/inbox?booking={booking.id}` so the right thread is opened.
- The check prevents the bot-style message from being re-sent if the renter clicks the button twice or comes back later.
- Update the "What happens next" list item from
  `"You'll be notified by email and in-app message."`
  to
  `"You'll be notified by email, in-app message, or WhatsApp."`

### 2. `src/pages/Inbox.tsx`
- Read the optional `?booking=<id>` query param on mount and, once the conversation list loads, auto-select that booking's thread (`setActiveId(bookingId)`). On mobile this also opens the chat panel directly.

### 3. Localization (`src/locales/en.json`, `fr.json`, `ar.json`)
- Add a new key `bookingConfirmed.autoMessageBody` with the templated greeting (placeholders for `{{bike}}`, `{{pickup}}`, `{{return}}`) in EN/FR/AR.
- Update the existing "notified by email and in-app message" string to include WhatsApp in all three languages (FR: "par e-mail, message dans l'app ou WhatsApp"; AR equivalent).

---

## Out of scope

- No new edge function, no real WhatsApp sending. WhatsApp is only added to the **copy** for now (we already collect the renter's WhatsApp number on the profile, so it's an honest promise of channels we can use).
- No changes to the agency-side inbox — the existing Realtime subscription on `booking_messages` will surface the new message instantly in the agency's inbox and bump their unread count.
- No schema or RLS changes — the existing `Booking parties can send messages` policy already permits this insert.

---

## Technical details

- Idempotency on the auto-message uses a `select count` on `booking_messages` filtered by `booking_id` + `sender_id = auth.uid()` before inserting. We do NOT rely on a unique constraint.
- The "Message agency" button gets a brief loading state during the insert + navigation so a double-click can't fire two inserts.
- Body is built client-side in the user's current `i18n` language using `t('bookingConfirmed.autoMessageBody', { bike, pickup, return })`. Dates are formatted with the existing `date-fns` locale-aware formatter already used on the page.
- `Inbox.tsx` selection: after the conversations array is populated, if `searchParams.get('booking')` matches a row in `convs`, call `setActiveId(...)` once. Wrap in a `useEffect` that depends on `convs.length` and runs only when `activeId` is still `null` so we don't override later user navigation.