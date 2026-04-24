
# Agencies Landing Page + Trial & Lockout System

## Decisions locked in
- **Pricing**: Pro **99 MAD/mo**, Business **299 MAD/mo** (project rules win over draft spec's 80/250). Yearly = 12× monthly with **20% discount** displayed.
- **Trial**: every new agency signup auto-starts a **30-day Pro trial**. No credit card. After 30 days → 3-day grace → locked (listings hidden) until they pay or downgrade to Free.
- **Booking fee**: keep at **10 MAD** renter-side per locked rules (the draft mentioned "50 MAD" in the marketing copy in places — I'll use **10 MAD renter / 50 MAD agency confirmation fee** consistent with project rules).
- All copy in EN/FR/AR with RTL support.

---

## PART 1 — Header navigation

**`src/components/Header.tsx`**
- Add visible desktop link **"Agencies"** (with `Building2` icon) between existing nav items and the language switcher area, only at `lg+` breakpoint.
- Add **"Agencies"** to the mobile drawer menu, placed near the top (above "About Us").
- Wire to route `/agencies`.

**`src/locales/{en,fr,ar}.json`** + `src/locales/translations.ts`
- Add `header.agencies` key: EN "Agencies" / FR "Agences" / AR "للوكالات".

---

## PART 2 — `/agencies` landing page

**New file: `src/pages/Agencies.tsx`** — single-route, long-scroll marketing page wrapped in existing public `Header` + `Footer`. Brand tokens: `#9FE870` lime, `#163300` forest, Inter, Wise-style. RTL-safe (logical padding, `flex-row-reverse` for AR where needed).

Sections (all i18n-keyed under `agenciesPage.*`):
1. **Hero** — pill "FOR RENTAL AGENCIES", H1 "Grow your rental business with Motonita", subheadline mentioning **flat 50 MAD per confirmed booking, 0% commission**, two CTAs: "Start 30-day free trial" → `/agency/signup`, "Log in to dashboard" → `/agency/login`. Trust signals row.
2. **Comparison** — 2-column table (Foreign apps ❌ vs Motonita ✓) with the example calculation block.
3. **Feature grid** — 6 cards (Smart Dashboard, Unlimited Listings, Direct Payments, Customer Chat, Analytics, Verification) using lucide icons.
4. **How it works** — 4-step horizontal timeline.
5. **Pricing** — monthly/yearly toggle, 3 cards (Free / Pro 99 MAD ⭐ / Business 299 MAD). Yearly: Pro 950 MAD/yr (save 238), Business 2,870 MAD/yr (save 718). "Most Popular" badge on Pro. CTAs route to `/agency/signup?plan=pro|business` or `mailto:contact@motonita.ma` for Business "Contact sales".
6. **Trial explainer** — 4 cards (Day 1, Days 1–30, Day 25 reminder, Day 30 transition) + amber warning box about lockout.
7. **FAQ** — `Accordion` (existing shadcn), 10 agency-specific Q&As. Use the project rules-correct numbers (10 MAD renter fee, 50 MAD agency confirmation fee, 99 / 299 MAD plans).
8. **Social proof** — honest framing: "Launch partners growing with us" + 3 mock testimonials clearly labeled, no fake stats. Show small honest numbers.
9. **Final CTA** — full-width forest band, white H1, two buttons (lime primary → `/agency/signup`, outline white → `/agency/login`), contact line.

Add SEO `<title>` + meta description via document head.

**Routing — `src/App.tsx`**
- Add `<Route path="/agencies" element={<Agencies />} />` in the public routes block. Lazy-load.

---

## PART 3 — Trial & lockout state machine

### Database migration

Extend `public.agency_subscriptions`:
```sql
ALTER TABLE public.agency_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz;
```

Allowed `status` values (string, no enum to stay consistent with existing schema): `trialing`, `active`, `past_due`, `locked`, `cancelled`, `free`.

**Auto-start trial on agency signup** — extend `handle_new_user()` (or add a sibling trigger on `user_roles` insert for role `agency`) to insert a `trialing` Pro subscription with `trial_ends_at = now() + interval '30 days'`. Will be wired so existing `ensureSubscription()` in `useAgencyData.ts` returns trial subs unchanged.

### RPC: `enforce_subscription_lifecycle()`
SECURITY DEFINER, scans subscriptions and transitions:
- `trialing` & `trial_ends_at < now()` → `past_due`, set `grace_period_ends_at = now() + 3 days`, set plan=`free` semantics flag, enqueue email "trial ended, 3 days to upgrade".
- `past_due` & `grace_period_ends_at < now()` → `locked`, set `locked_at = now()`, plan = `free`, enqueue email "account locked".
- `trialing` & `trial_ends_at - now() < 5 days` & no `trial_reminder_sent_at` → enqueue reminder email, stamp `trial_reminder_sent_at`.

### Edge function: `subscription-lifecycle-cron`
- New `supabase/functions/subscription-lifecycle-cron/index.ts`.
- Calls `enforce_subscription_lifecycle()` and uses existing `enqueue_email` RPC + `send-transactional-email` templates (`agency_trial_reminder`, `agency_trial_ended`, `agency_account_locked`) — I'll add 3 new React Email templates under `supabase/functions/_shared/transactional-email-templates/`.
- Schedule with pg_cron via the insert tool: every day at 09:00 UTC.

### RLS — hide locked listings from public search
Update existing `Public can view available bikes` policy on `bikes`:
```sql
-- new EXISTS clause
AND NOT EXISTS (
  SELECT 1 FROM agency_subscriptions s
  WHERE s.user_id = bt.owner_id AND s.status = 'locked'
)
```
Owners + admins continue to see their own bikes via existing policies.

### Frontend wiring
- **`src/hooks/useAgencyData.ts`** — extend `AgencySubscription` interface with new fields, expose `isTrialing`, `daysLeftInTrial`, `isPastDue`, `isLocked`.
- **`src/components/agency/AgencyShell.tsx`** — show:
  - **Trial banner** (lime) when `isTrialing`: "X days left in your free trial. Upgrade to Pro" → `/agency/subscription`.
  - **Grace warning** (amber) when `isPastDue`: "Trial ended. Upgrade within X days to keep your listings live."
  - **Lockout overlay** when `isLocked`: blocks access to Bookings/Bikes/Messages with "Account locked — upgrade to reactivate" + Pay button → `/agency/subscription`.
- **`src/pages/agency/Subscription.tsx`** — show trial badge + "ends on …" date; payment success transitions status back to `active`.

---

## Files touched (summary)
- **New**: `src/pages/Agencies.tsx`, `supabase/functions/subscription-lifecycle-cron/index.ts`, 3 React Email templates, 1 SQL migration.
- **Edited**: `src/App.tsx`, `src/components/Header.tsx`, 3 locale files + `translations.ts`, `src/hooks/useAgencyData.ts`, `src/components/agency/AgencyShell.tsx`, `src/pages/agency/Subscription.tsx`, `supabase/functions/_shared/transactional-email-templates/registry.ts`, `supabase/config.toml` (add cron function block if needed).
- **DB**: 1 migration (columns + trigger update + RLS update + RPC), 1 cron schedule via insert tool.

Reply **approve** to implement.
