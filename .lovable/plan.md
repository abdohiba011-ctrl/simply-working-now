# Agency Side Overhaul

A senior-level pass on the agency dashboard. Focus areas: motorbikes (gallery + uploads), messages (proper inbox UX), bookings polish, wallet top-up scoping, notifications, theme toggle, and profile logo upload.

---

## 1. Motorbikes — list & detail

**Motorbikes list page**
- Add a Grid / Table view toggle (persisted in URL `?view=grid|table`)
- Grid: existing card style, polished
- Table: columns — image thumb, name, engine/trans, daily price, status, bookings count, last booked, actions (View, Edit, Public)
- Keep search + add motorbike button

**Motorbike detail page**
- Image gallery: main image hero + thumbnail strip; click to swap; lightbox on click
- Remove the Rating and Reviews stat cards (per request)
- Keep: Daily price + Status cards, Description
- "Public view" button opens `/bikes/:id` in a new tab — verify route works (it points to `BikeDetails` route)
- "Edit" goes to wizard

---

## 2. Image management (the big one)

**Replace URL inputs with real uploads.** Use the existing public `bike-images` storage bucket.

New reusable component `MotorbikeImageManager`:
- Drag-and-drop or click-to-add multiple images
- Live thumbnail previews with progress bars during upload
- Per-image actions: **Set as primary**, **Replace**, **Delete**
- Reorder via drag (saves `display_order`)
- Hard cap at 8 images per bike, 5 MB each, JPG/PNG/WebP only
- Client-side compression (reuse `src/lib/imageCompression.ts`)
- **Privacy notice banner** at the top: *"Don't include your agency logo, watermarks, or contact info in your motorbike photos — renters discover and book through Motonita only."*

**Storage model**
- Primary image → `bike_types.main_image_url` (the one flagged primary)
- Additional images → existing `bike_type_images` table (`bike_type_id`, `image_url`, `display_order`)
- Files saved to `bike-images/{owner_id}/{bike_type_id}/{uuid}.{ext}`

**Storage RLS** (migration)
- Owners can insert/update/delete objects in `bike-images` under their own folder
- Public can read (bucket already public)

**Motorbike wizard**
- Replace the "Main image URL" input with the new `MotorbikeImageManager` (works in both create and edit modes; in create mode, defer image upload until the bike row exists, OR create the row first then attach — we'll create the row first on Save, then user manages images on the next screen, OR allow staging in memory and uploading on save). Simpler UX: split create into two steps — Save details → land on edit page where image manager is enabled.
- Keep editable fields: name, description, daily price, engine, transmission, fuel
- "After saving" toast and stay on edit page so user can manage images

---

## 3. Messages — full UX redesign

Redesigned as a proper inbox (Linear/Front-style):

```text
┌─────────────────────────────────────────────────────────┐
│ Messages                              [Search] [Filter] │
├──────────────┬──────────────────────────────────────────┤
│ Conversation │  Header: Renter name · booking summary   │
│ list         │  + status pill + "Open booking" link     │
│              ├──────────────────────────────────────────┤
│ ● Renter A   │                                          │
│   "last msg" │     Message bubbles (own = primary,      │
│   2m · ●     │     theirs = muted, with timestamps      │
│              │     grouped by day, read receipts)       │
│ Renter B     │                                          │
│   "..."      │                                          │
│   1h         │                                          │
│              ├──────────────────────────────────────────┤
│              │  [Type a message…]    [Send]             │
└──────────────┴──────────────────────────────────────────┘
```

Improvements over current:
- Avatars (initials), unread dot, last-message preview, relative time
- Filter chips: All / Unread / Pending / Confirmed
- Search across renter name and message body
- Active thread highlighted; auto-select first unread
- Sticky composer at bottom of right pane
- Empty state per pane (no convo selected vs no messages)
- Mobile: full-screen thread view with back button
- Realtime: subscribe to `booking_messages` to bump unread + reorder list

---

## 4. Bookings page

Already mostly good. Small additions:
- Date range filter and "Today / This week / This month" quick chips
- Column for payment status
- Export CSV button (client-side from filtered rows)
- Detail page: confirm "Print" works as-is (do not regress)

---

## 5. Wallet top-up — keep agency on agency side

Bug: clicking "Top up wallet" from agency header sends user to renter `/billing` flow.

Fix:
- Agency header wallet button → `/agency/finance#wallet` (already correct in code; verify and audit other entry points)
- Audit `useAgencyStore` / Finance / Wallet pages and the YouCan Pay flow to ensure return URLs are `/agency/finance` or `/agency/wallet/topup-status`, not `/payment-status` (renter)
- The hosted payment helper `openHostedPayment.ts` likely accepts a return path — pass an agency-scoped one when initiated from agency context

---

## 6. Notifications

- Wire the bell icon in agency Header to a real popover listing the latest 10 notifications for `auth.uid()` from `notifications` table
- Unread badge count
- Mark all as read action
- "View all" → `/agency/settings#notifications` (existing page)
- Realtime subscription so new notifications appear without refresh

---

## 7. Theme toggle (light/dark)

- Add a theme toggle button (Sun/Moon icon) in the agency Header next to the language selector
- Reuse existing `useTheme` hook and `next-themes` provider already used in public site
- Persist choice; respect system default initially

---

## 8. Agency profile — real logo upload

- Replace "Logo URL" input with a `LogoUploader` component
- Drop zone + preview circle (200×200), Replace and Remove actions
- Upload to existing `avatars` bucket under `agency-logos/{user_id}/{uuid}.{ext}`
- Client-side compression, JPG/PNG/WebP, max 2 MB
- Save resulting URL to `profiles.business_logo_url`

---

## Technical details

**New / changed files**
- `src/components/agency/MotorbikeImageManager.tsx` (new)
- `src/components/agency/LogoUploader.tsx` (new)
- `src/components/agency/NotificationsPopover.tsx` (new)
- `src/components/agency/ThemeToggle.tsx` (new) — small wrapper
- `src/components/agency/MessagesInbox.tsx` (new) + sub-components for list/thread/composer
- `src/pages/agency/Motorbikes.tsx` — grid/table toggle
- `src/pages/agency/MotorbikeDetail.tsx` — gallery, remove rating/reviews
- `src/pages/agency/MotorbikeWizard.tsx` — swap URL input for image manager, two-step flow
- `src/pages/agency/Messages.tsx` — replaced with new inbox layout
- `src/pages/agency/Profile.tsx` — swap URL input for `LogoUploader`
- `src/pages/agency/Bookings.tsx` — date filters + CSV export
- `src/components/agency/Header.tsx` — theme toggle, notifications popover, wallet route audit
- `src/lib/openHostedPayment.ts` — accept and honor `returnPath` so agency stays on agency

**Database (migration)**
- Storage RLS for `bike-images` bucket: owners write under their folder, public read
- Storage RLS for `avatars` bucket: extend to allow uploads under `agency-logos/{auth.uid()}/...`
- No schema changes — `bike_type_images` table already exists with `display_order`

**Out of scope (will not touch)**
- Public site, renter flows, admin panel
- Booking pricing logic / payments backend
- i18n translation strings — new copy will be added with English defaults; full FR/AR translation can follow

---

## Acceptance

- Motorbikes list switches between grid and table
- Detail page shows multi-image gallery, no ratings/reviews, "Public view" opens public bike page
- Editing supports add/replace/delete/reorder/set-primary images via drag-drop, no URL inputs anywhere
- Messages page feels like a real inbox with avatars, previews, unread, search, sticky composer
- Top-up wallet from agency stays on agency side
- Notification bell shows real notifications with unread counter
- Light/dark toggle in agency header works and persists
- Profile logo is uploaded, not pasted as URL