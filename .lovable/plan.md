## Audit method

Reviewed every file under `src/pages/agency/` and the agency chrome (`Header`, `MobileNav`, `AgencyShell`, `MotorbikeWizardForm/Dialog`, `SegmentedTabs`) at the 390×844 mobile viewport. Confirmed visually in the preview at `/agency/dashboard`, `/agency/finance#wallet`, `/agency/finance#transactions`, `/agency/agency-center#profile`, and `/agency/agency-center#verification`.

Pages are scored:
- **OK** — clean on mobile
- **Minor** — small overflow / cramped, not blocking
- **Broken** — overflows the viewport, content cut off, or unusable on mobile

---

## Page-by-page status

| # | Page | Status | Issue |
|---|------|--------|-------|
| 1 | `Dashboard.tsx` | **Broken** | "Today's schedule" row crams thumb + name + bike + Pickup pill + StatusChip on one line — customer name truncates to "A P." |
| 2 | `Motorbikes.tsx` (list) | OK | — |
| 3 | `MotorbikeDetail.tsx` | **Minor** | Sticky header still cramped when bike name is long; switch + Edit + 3-dot push title to ~80px |
| 4 | `Bookings.tsx` | OK | (already fixed last round) |
| 5 | `BookingDetail.tsx` | **Minor** | `text-3xl` title + 4-action row on 390px wraps into 3 rows; cards use heavy `p-6`; no back arrow on mobile |
| 6 | `Calendar.tsx` | OK | (already fixed) |
| 7 | `Messages.tsx` | OK | (already fixed) |
| 8 | `NotificationsInbox.tsx` | OK | — |
| 9 | `Wallet.tsx` | **Minor** | `text-5xl` balance can wrap when amount is large (e.g. "1,234,567 MAD"); top-up dialog OK |
| 10 | `Transactions.tsx` | **Broken** | `<Table>` not wrapped in horizontal-scroll container — last column "Balance after" is clipped; should switch to card list on mobile. Search `w-64` not responsive. |
| 11 | `Invoices.tsx` | **Broken** | Same as Transactions — bare `<Table>` overflows on mobile |
| 12 | `Subscription.tsx` | **Minor** | `text-3xl` title; "Popular" badge collides with card edge; otherwise fine |
| 13 | `Finance.tsx` (hub) | OK | — |
| 14 | `AgencyCenter.tsx` (hub) | OK | — |
| 15 | `SettingsHub.tsx` (hub) | OK | — |
| 16 | `Profile.tsx` | **Broken** | `grid-cols-2` for business email + phone on every viewport — inputs become unusably narrow on mobile |
| 17 | `Verification.tsx` | **Broken** | (a) Entity-type buttons: "Auto-entrepreneur" label wraps to 2 lines; (b) sticky submit bar overlaps with bottom nav; (c) banner text uses fixed `text-slate-950` — illegible in dark mode |
| 18 | `Analytics.tsx` | OK | empty state |
| 19 | `Preferences.tsx` | OK | — |
| 20 | `NotificationSettings.tsx` | OK | table already wrapped in `overflow-x-auto` |
| 21 | `Help.tsx` | OK | — |
| 22 | `Team.tsx` | OK | empty state |
| 23 | `Integrations.tsx` | OK | empty state (also: route still exists but item removed from More menu) |
| 24 | `MotorbikeWizard.tsx` (route) | OK | (now opened via dialog) |
| 25 | `Placeholder.tsx` | OK | — |
| — | `Header.tsx` (chrome) | **Minor** | At 360–390px the right cluster (lang + wallet + theme + bell + user chip) gets very tight; risks overflow with long balance values |

---

## Confirmed visually

- `/finance#transactions` — table scrolls horizontally inside the card; "Balance after" column cut off.
- `/agency-center#verification` — "Auto-entrepreneur" wraps; sticky submit bar shows behind bottom nav.
- `/agency-center#profile` — email/phone inputs squeezed into tiny half-columns.
- `/dashboard` — "Today's schedule" row truncates customer to a single letter.
- `/finance#wallet` — fine.

---

## Fix plan (one PR, grouped)

### Group A — table → card list on mobile (fixes "Broken")

1. **Transactions** — render a stacked card list under `md:hidden`, keep the table for `md:block`. Each card: date · type chip · description · amount (colored) · running balance.
2. **Invoices** — same pattern: card list on mobile, table from `md` up.
3. Make the search input `w-full md:w-64` in Transactions header and let the row use `flex-wrap`.

### Group B — Profile form

4. Change the email/phone grid from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`.
5. Reduce Card padding to `p-4 sm:p-6` for breathing room on mobile.

### Group C — Verification page

6. Entity-type segmented buttons: allow text wrap-friendly sizes (`text-xs sm:text-sm`, `gap-1.5`, `whitespace-nowrap` removed) and shorten label to "Auto-entr." under `sm:`.
7. Replace the hard-coded slate colors in the status banner with semantic tokens (`text-foreground`, `bg-muted`, etc.) so it works in dark mode.
8. Add `pb-32` to the outer container (currently `pb-28`) and give the sticky submit bar `bottom-[calc(env(safe-area-inset-bottom)+5rem)]` on mobile so it sits above the bottom nav.

### Group D — Dashboard "Today's schedule"

9. On mobile, restructure each row to two lines: top = time + thumb + name + status chip; bottom = bike name + Pickup/Return pill aligned right. Hide the Pickup pill on `<sm` (status chip already conveys state).

### Group E — small polish

10. `BookingDetail`: title `text-2xl sm:text-3xl`; make Print button `sm:inline-flex` only; add a back chevron at top on mobile.
11. `Wallet`: balance `text-4xl sm:text-5xl`, wrap MAD label below for very large amounts.
12. `MotorbikeDetail` sticky header: hide the title text under `xs` when the switch is on (already badge implies bike); or use `text-[13px]` and `truncate flex-1 min-w-0`.
13. `Header`: shrink right-cluster icon buttons to `h-9 w-9` on `<sm`; truncate wallet pill to "100" without the "MAD" suffix on `<sm` (already icon-only — verify).
14. `Subscription`: title `text-2xl sm:text-3xl`; ensure plan card has `mt-3` for the Popular badge.

### Out of scope

- No business-logic / API changes.
- No new routes.
- Desktop layouts unchanged.

---

## Order of execution (when you approve)

1. Group A (Transactions + Invoices) — biggest visual fix.
2. Group B (Profile).
3. Group C (Verification).
4. Group D (Dashboard).
5. Group E polish.

Each group is a small, isolated edit (1–2 files). I'll verify each on mobile viewport after the change.
