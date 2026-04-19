
This is a massive scope (~50+ pages, 100+ components). Rather than blindly editing the entire codebase — which would risk breaking working features — I'll run a structured audit and fix in prioritized waves. I need to clarify scope before starting.

## Audit Strategy

**Wave 1 — Automated diagnostics (no risk)**
- Run `tsc --noEmit` to surface all TypeScript errors
- Run ESLint across the project for warnings/dead code
- Run `supabase--linter` for DB/security warnings
- Pull console logs and network errors from the live preview
- Run `security--run_security_scan` for any new findings

**Wave 2 — Critical fixes (🔴)**
- Fix every TS error blocking the build
- Fix any runtime console errors visible in the preview
- Fix broken imports, null refs, failed Supabase queries

**Wave 3 — Functional sweep (🟠)**
- Walk the main flows in code: Auth → Listings → Bike details → Booking → Checkout → Confirmation
- Walk admin flows: Panel tabs, client details, booking details, fleet, verifications
- Walk business flows: Dashboard, motorbikes, bookings
- Fix dead buttons, missing handlers, unhandled promise rejections, missing `await`s

**Wave 4 — UI/UX & states (🟡)**
- Add missing loading skeletons, empty states, error states where data is fetched
- Replace any remaining hardcoded colors flagged by lint
- Verify responsive layout on key pages at 375px, 768px, 1440px (via browser tool, only if approved)

**Wave 5 — Quality (🔵)**
- Remove dead imports/vars surfaced by ESLint
- Resolve TODO/FIXME comments
- Tighten any remaining `as any` introduced by recent migrations

## Reporting
Final summary in your requested format: pages audited, issues found, issues fixed, remaining (with reasons).

## Scope Questions

Three quick clarifications before I begin — this affects how deep I go and how long it takes:

1. **Browser-based runtime testing** — should I use the browser automation tool to actually click through every page in the preview? It's accurate but slow and rate-limited. Alternative: code-only static audit (faster, catches most issues, may miss some runtime-only bugs).

2. **Scope priority** — fix everything (large diff, longer turnaround, higher regression risk) vs. critical + functional only (🔴 + 🟠) and report 🟡/🔵 as a follow-up list?

3. **Edit budget** — comfortable with potentially 30-60 file edits in a single pass, or prefer I break it into multiple checkpoints (e.g., wave-by-wave with your approval between)?

Once you confirm, I'll start with Wave 1 diagnostics in default mode.
