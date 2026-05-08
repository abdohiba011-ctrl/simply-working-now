## Goal

Polish the agency mobile (responsive) experience across 5 screens and the bottom-nav "More" drawer.

## 1. Motorbike Detail page header (`src/pages/agency/MotorbikeDetail.tsx`)

The sticky header currently crowds Back · Title · Available switch · Preview · Edit · Archive into one row → overflow on mobile.

Mobile layout (kept clean, desktop unchanged):
- Row: `Back` (icon only) · Title · `Available` switch · `Edit` button · 3-dot menu (`MoreVertical`)
- 3-dot menu (DropdownMenu) contains: **Preview** (opens `/bikes/:id` in new tab) and **Archive** (opens existing archive dialog)
- "Live on Motonita" / current "Available" label → just **"Live"** on mobile
- Desktop (sm+): keep all buttons inline as today

## 2. Bookings page (`src/pages/agency/Bookings.tsx`)

- **Date picker crash** (laptop/tablet/mobile): the popover Calendar in range mode renders unconstrained and overflows. Fix by:
  - Constrain `PopoverContent` width (`w-[min(92vw,340px)]`), add `pointer-events-auto`, ensure `align="start"` + `sideOffset` so it stays within viewport
  - Use the existing flex-based `Calendar` component classes (already responsive). Keep `numberOfMonths={1}`.
- **Status filters on mobile**: replace horizontal scroll with: 3 visible chips (`All`, `Pending`, `Confirmed`) + a **More** dropdown (3 dots) listing the rest (`Completed`, `No-show`, `Declined`, `Cancelled`, `Late cancel`). Selected "more" status shows as the active chip replacing the More label until cleared. Desktop: keep wrap as today.

## 3. Messages page (full-screen on mobile)

Currently wrapped in `AgencyLayout` (header + bottom nav + padding) → cramped.

- In `src/pages/agency/Messages.tsx`: when `useIsMobile()`, render WITHOUT `AgencyLayout` — full-viewport dedicated page with its own top bar containing a **back arrow** (→ `/agency/dashboard`) and "Messages" title. No bottom nav, no agency header.
- Desktop unchanged.
- When a conversation is open on mobile, the ChatThread already has its own back (already wired via `onBack`).

## 4. Calendar page (`src/pages/agency/Calendar.tsx`)

Mobile fixes:
- Header row stacks: title on top, month nav + Today below, full-width
- Month label uses `flex-1 text-center`
- Grid cells: reduce `min-h-24` → `min-h-16` on mobile (`min-h-16 sm:min-h-24`), shrink event chip text, reduce padding (`p-1`)
- Wrap whole grid in `overflow-x-hidden`; ensure inner grid uses `gap-0.5 sm:gap-1`
- Day-of-week header letters single char on mobile (`M T W T F S S`)

## 5. Simplified More drawer (`src/components/agency/MobileNav.tsx`)

Replace the flat 9-item list with **3 grouped sections**, each opening its hub page:

- **Finance** → `/agency/finance` (tabs: Wallet, Transactions)
- **Agency** → `/agency/agency-center` (tabs: Profile, Verification, Analytics)
- **Settings** → `/agency/settings` (tabs: Preferences, Notifications, Help & Support)
- Plus single item: **Calendar** → `/agency/calendar`

Each row shows the section name + small subtitle listing what's inside. Tapping navigates to the hub page (which already has SegmentedTabs for sub-sections). Removes overload.

## Out of scope

- No backend / business-logic changes
- Desktop layouts unchanged unless noted
- No new routes added (uses existing hub pages with hash tabs)

## Technical notes

- Use shadcn `DropdownMenu` for the 3-dot menus (already in project)
- Reuse existing `MotorbikeWizardDialog` and archive dialog — only the trigger UI moves
- Date picker: keep `react-day-picker` range mode; just constrain popover width
