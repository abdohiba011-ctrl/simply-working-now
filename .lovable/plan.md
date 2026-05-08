## Goal

Make the agency side feel native on mobile. Bottom nav stays (it's good), hamburger goes away, the header is cleaned up, and every page (Motorbikes, Bookings, Messages, plus the rest) gets a real mobile layout instead of cramped desktop tables.

## Scope

### 1. Remove the hamburger / mobile sidebar drawer
- `src/components/agency/AgencyShell.tsx`
  - Drop the `mobileSidebar` state, the left `<Sheet>`, and the `onMobileMenu` prop wiring.
- `src/components/agency/Header.tsx`
  - Remove the `onMobileMenu` prop and the `<Menu>` button (lines 99–101). Header on mobile starts directly with content.
- `src/components/agency/Sidebar.tsx` keeps its desktop‑only behavior (already `lg:` gated), no changes.

### 2. Header polish on mobile (no crushing)
- Bigger tap targets: bump icon buttons (`ThemeToggle`, `NotificationsPopover`, `Help`) to `h-10 w-10` on mobile, icons to `h-5 w-5`.
- The page title / greeting chip stays hidden on mobile (the bottom nav already labels the route).
- Search button stays desktop‑only (`md:flex`). Mobile users have a search field inside each list page.
- Wallet pill: keep visible from `sm:` up; on mobile (<sm) replace with a compact icon‑only wallet button so nothing wraps. Tap → `/agency/finance#wallet`.
- Language and User chip stay; user chip drops the name on small screens (already `lg:block`).
- Header height stays `h-16`; horizontal padding goes from `px-4` to `px-3` on mobile to free space.

### 3. Bottom nav: edge‑to‑edge, sticky, no rounded float
- `src/components/agency/MobileNav.tsx`
  - Change the outer `<nav>` from `fixed inset-x-3 bottom-3 ... rounded-2xl border ... shadow-lg` to a true bottom bar: `fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur` with `pb-[env(safe-area-inset-bottom)]` so iPhone home‑indicator doesn't sit on the icons.
  - Drop the outer rounded corners and the side margin.
  - Adjust `AgencyShell` `<main>` bottom padding from `pb-24` to `pb-20 lg:pb-8` to match the new flush bar.

### 4. Motorbikes page (mobile = cards only)
`src/pages/agency/Motorbikes.tsx`
- On `< md`: hide the Grid/Table toggle entirely (toggle stays for `md:` and up).
- Force the cards layout on `< md` regardless of the `?view=table` URL param.
- Toolbar on mobile: a single row with the search input on the left and one primary button on the right reading **"+ Motorbike"** (use `sm:hidden` for the short label and `hidden sm:inline` for "Add motorbike"). Active/Archived tabs move to a second compact row.
- Card size on mobile: full‑width single column, `aspect-[16/10]` image to take less vertical space; price + status row stays.

### 5. "Add / Edit motorbike" → bottom sheet on mobile, dialog on desktop
`src/components/agency/MotorbikeWizardDialog.tsx` becomes responsive:
- On `< md`: render with shadcn `<Sheet side="bottom">` styled as a near‑full‑height sheet (`h-[92dvh] rounded-t-2xl p-0`). The `MotorbikeWizardForm` keeps its existing step UI; only the container changes.
- On `>= md`: keep the current centered `<Dialog>` exactly as today.
- A small `useIsMobile()` switch picks the wrapper. Same props (`open`, `onOpenChange`, `bikeId`, `onSaved`) — no caller changes.
- (We are *not* converting the wizard into a separate route; the user offered "dedicated page OR bottom sheet" — bottom sheet keeps the URL stable and is cheaper to ship.)

### 6. Bookings page (mobile = cards)
`src/pages/agency/Bookings.tsx`
- On `< md`: hide the `<Table>` and render a card list instead — one card per booking with: customer name + contact, bike name, pickup → return dates, total in MAD, `<StatusChip>`, and a chevron `Open` affordance. Whole card is tappable.
- The status filter chips become a horizontally scrollable row on mobile (`overflow-x-auto -mx-3 px-3 snap-x` with `whitespace-nowrap`) so they don't wrap into 3 lines.
- Search + date‑range + Export collapse into a sticky toolbar that wraps cleanly: search on its own row, then date/Export side by side.

### 7. Messages page polish
`src/pages/agency/Messages.tsx` already swaps via `useIsMobile()`. We will:
- Remove any horizontal overflow on the conversation list rows on small widths (currently fine, just verify).
- Match the renter inbox: when a conversation is open on mobile, the list is hidden and the chat fills the screen above the bottom nav.
- Add safe bottom padding (`pb-20`) so the composer isn't hidden behind the nav.

### 8. Other agency pages — light responsive sweep
For each of: Dashboard, Calendar, Finance, Wallet, Transactions, Invoices, Analytics, Profile, Verification, Subscription, Team, Preferences, NotificationSettings, Integrations, Help, AgencyCenter, BookingDetail, MotorbikeDetail.
- Action: scan for `<Table>` usage and any `lg:`‑only layouts. Add a card fallback only where a real table exists; otherwise just verify spacing / wrapping.
- Add `pb-20` to any page that has a sticky/fixed bottom CTA to avoid overlap with the new flush bottom bar.
- This sweep is *fix‑only*; we won't redesign these pages.

## Out of scope
- Renter side (no changes).
- Agency desktop sidebar — already fine, untouched.
- New features (analytics widgets, calendar redesign, etc.).
- Translating new strings — "+ Motorbike", "Add motorbike", page titles stay in their current language; i18n keys can be a follow‑up.

## Files touched
- `src/components/agency/AgencyShell.tsx`
- `src/components/agency/Header.tsx`
- `src/components/agency/MobileNav.tsx`
- `src/components/agency/MotorbikeWizardDialog.tsx`
- `src/pages/agency/Motorbikes.tsx`
- `src/pages/agency/Bookings.tsx`
- `src/pages/agency/Messages.tsx`
- Other `src/pages/agency/*.tsx` only when the responsive sweep finds a concrete issue.

## Risks / notes
- The bottom sheet variant of the motorbike wizard reuses the existing form unchanged; if any internal absolute positioning inside the form assumed Dialog dimensions, we'll patch it.
- Removing the hamburger means tablet users in the 768–1023 range no longer have access to the desktop sidebar items that aren't in the bottom‑nav "More" sheet. The "More" sheet already lists Calendar, Wallet, Transactions, Profile, Verification, Analytics, Preferences, Notifications, Integrations, Help — i.e. parity with sidebar. So nothing is lost.
