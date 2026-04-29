## Goal

Walk every meaningful page on the platform as the admin account `abdrahimbamouh56@gmail.com`, capture every real error (broken renders, console errors, failed network calls, dead buttons, RLS denials, blank pages, broken redirects), then fix them. Plus eliminate the noisy "Function components cannot be given refs" dev warning that floods the console on every page load.

## Scope (all three roles)

**Public / Renter side (~16 routes)**
- `/`, `/rent/casablanca` (+ a couple other cities), `/bike/:id`, `/booking-review`, `/checkout`, `/pay/youcanpay`, `/payment-status`, `/confirmation`
- `/about`, `/blog`, `/blog/:slug`, `/agencies`, `/booking-fee`, `/affiliate`, `/contact`, `/fixers`
- `/profile`, `/booking-history`, `/booking/:id`, `/inbox`, `/notifications`, `/settings`, `/verification`, `/billing`

**Agency side (~20 routes under `/agency/*`)**
- `dashboard`, `bookings`, `bookings/:id`, `motorbikes`, `motorbikes/new`, `motorbikes/:id`, `messages`, `calendar`
- `finance` (wallet/transactions/subscription/invoices tabs), `agency-center` (profile/team/verification/analytics tabs), `settings` (preferences/notifications/integrations/help tabs)

**Admin side (~12 routes under `/admin/*`)**
- `panel` (every tab: clients, agencies, bikes, bookings, finance, etc.), `bookings`, `bookings/:id`, `fleet`, `fleet/:id`, `analytics`, `verifications`, `agencies/verifications`, `bikes/approvals`, `clients/:id`, `users/:id`, `verifications/:id`, `contact-messages`

## Method

For each route:
1. Navigate via browser tool
2. Screenshot if anything looks off
3. Pull console errors (filter out the known ref warning until it's fixed)
4. Pull network requests, flag any 4xx/5xx
5. Click into 2-3 representative items per list page (booking row, motorbike, client)
6. Note bugs in the task tracker

I will **not** perform destructive actions (no deleting bookings, deleting users, sending real emails, processing real payments). For mutation flows, I will inspect the form/button reachability but stop short of submitting if data would change permanently.

## Fix phase

After the walkthrough, group findings by severity:
- **P0** — page crashes, blank screens, infinite loaders, RLS-denied data, broken auth → fix all
- **P1** — broken buttons, dead links, wrong navigation, missing translations on visible UI → fix all
- **P2** — visual glitches, minor copy issues, console warnings → fix where cheap

Fix the noisy `Function components cannot be given refs` warning by auditing the provider chain in `App.tsx` (most likely a ref forwarded into `LanguageSuggestionBanner`, `ScrollToTopButton`, or `AuthProvider` via Radix internals — needs targeted forwardRef wrapping or removing the offending ref-recipient).

## What you should expect

- Many tool calls (likely 80-150). I will batch where possible (parallel reads, parallel screenshots).
- Periodic check-ins if I hit something large that deserves a decision (e.g. "this whole page is broken — rewrite or hot-fix?").
- A final summary listing every bug found, severity, and what I fixed vs deferred.

## Out of scope

- Lighthouse / performance audits
- Mobile/RTL deep visual review (unless a route is clearly broken at 375px)
- Writing new automated tests
- Rebuilding any feature from scratch

## Approve to proceed

Once you approve, I switch to build mode and begin the walkthrough + fixes in one continuous run.
