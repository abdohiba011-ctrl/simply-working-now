## Goal

Make the renter inbox feel like a real per‑booking conversation:

1. Each conversation already shows the agency avatar + name in the left list, but the **chat header** doesn't show the bike. Surface the booked motorbike (thumbnail + name) inside the chat so the renter clearly sees which booking they're discussing.
2. Add a **24‑hour confirmation countdown** at the top of the chat for `pending` bookings, with a clear "Agency did not respond — penalty applies" state once the window expires.

No backend / business‑rule changes — this is presentation + a derived timer using existing data.

## What changes

### `src/pages/Inbox.tsx`
- Extend the `bookings` query to also pull bike imagery and the booking timestamp:
  - `bikes(bike_types(name, main_image_url))`
  - `created_at` on the booking row.
- Extend the `Conv` type with `bike_image_url: string | null` and `created_at: string`.
- Pass two new props to `ChatThread`:
  - `bikeImageUrl={active.bike_image_url}`
  - `bookingCreatedAt={active.created_at}`
  - `bookingStatus={active.booking_status}`
- Keep `counterpartySubtitle` short ("Booking #abcd1234"); the bike line moves into a dedicated header row.

### `src/components/chat/ChatThread.tsx`
- Add optional props: `bikeImageUrl?: string | null`, `bikeName?: string`, `bookingCreatedAt?: string`, `bookingStatus?: string | null`.
- Render a **booking strip** directly under the existing agency header:
  - Square thumbnail (bike image or motorcycle icon fallback), bike name, "Booking #abcd1234".
  - The row is non‑interactive (matches the rest of the header).
- Render a **24h response countdown** band right under the booking strip, only when `bookingStatus === 'pending'` and `bookingCreatedAt` exists:
  - Compute `deadline = bookingCreatedAt + 24h`.
  - While `now < deadline`: show "Agency to confirm in HH:MM:SS" with a subtle muted background; updates every second via a small `useEffect` interval.
  - When `now >= deadline`: switch to a destructive‑toned banner: "Agency did not respond within 24h — penalty applies." Stop the interval.
  - Hide the band entirely for confirmed / cancelled / completed bookings.
- No banner is shown for non‑pending statuses.

### Out of scope (intentionally)
- Awarding / recording the agency penalty (server‑side rule). The user asked for the *visible* countdown + "not responding" state; the actual penalty engine already lives elsewhere and is unchanged.
- Editing the agency‑side inbox.
- Schema / migration changes.

## Files touched
- `src/pages/Inbox.tsx` (query + props)
- `src/components/chat/ChatThread.tsx` (new header rows + countdown)

## Technical notes
- Countdown uses `useEffect` + `setInterval(1000)`, cleared on unmount and when status leaves `pending`.
- Time formatting is local (`Math.floor` of remaining seconds → HH:MM:SS). No new deps.
- All copy uses existing tone; if i18n is required for these new strings later, keys can be added in a follow‑up — current chat header already mixes hard‑coded English ("Booking #…").
