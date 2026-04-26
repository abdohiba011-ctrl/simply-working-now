
## Scope

Four enhancements to `/billing` for renters. Payment-methods CRUD is **dropped** per your answer — we'll keep the informational tab as is and add a clear note that no card details are stored.

Renter-only enforcement everywhere: gate the page and all actions on `userRoles.includes("renter")`; non-renters see an EmptyState pointing to signup.

---

## 1. Credits history chart (Credits tab)

- Add a Recharts `AreaChart` above the preset top-up buttons titled **"Balance over time"**.
- Build the series client-side from `transactions` (already loaded via `useRenterWallet`):
  - Sort ascending by `created_at`.
  - Use `balance_after` as the Y value (already stored on every transaction by `credit_renter_wallet`).
  - For the leading point before the first transaction, prepend `{ date: firstTx.created_at - 1, balance: 0 }`.
  - Append a final synthetic point `{ date: now, balance }` so the line reaches today.
- Range selector: chips for **7d / 30d / 90d / All** (default 30d). Filter the series by date.
- Use the existing `chart.tsx` ChartContainer with `--color-balance: hsl(var(--primary))` (#9FE870 brand lime) and a soft area fill (gradient from primary/40 to primary/0).
- Empty state: when no transactions, show a muted `EmptyState` with the wallet icon and copy "Top up to start tracking your balance".
- Mobile: chart height 180px, desktop 240px. RTL-safe (Recharts handles automatically).

## 2. Server-generated PDF receipts

### New edge function: `generate-receipt`

- Path: `supabase/functions/generate-receipt/index.ts`
- Auth: validate JWT in code (signing-keys system); only the transaction owner OR an admin can fetch. Return 403 otherwise.
- Input (POST JSON): `{ transaction_id: string }` validated with Zod.
- Logic:
  1. Service-role client loads the row from `renter_wallet_transactions` joined with `profiles` (name, email, address) and the transaction's `related_payment_id` from `youcanpay_payments` if present (for the external payment reference).
  2. Generate a deterministic receipt number: `MOT-{YYYYMM}-{first 8 chars of tx id}`.
  3. Render a PDF using `pdf-lib` (Deno-compatible, no native deps) — single A4 page with:
     - Motonita header (lime band + wordmark text — no image dependency to keep the function light)
     - Receipt number, issue date, transaction date
     - Renter billing block (name, email, address from profile)
     - Line item table: Description / Type / Reference / Amount / Currency
     - Balance after, payment method, status badge
     - Footer: "Motonita SARLAU · Casablanca · This is an electronic receipt for a non-refundable platform service fee." (matches your locked policy wording)
  4. Return PDF bytes with `Content-Type: application/pdf` and `Content-Disposition: inline; filename="..."`.
- CORS: import `corsHeaders` from `@supabase/supabase-js/cors`, include in all responses (success + error).
- `verify_jwt = false` is fine since we validate the JWT manually and rely on RLS/service-role checks.

### Frontend wiring (Transactions tab)

- Add a **"Download receipt"** ghost button (Lucide `Download` icon) on each transaction row.
- Visibility rule: only show for `status === "completed"`. (Pending/failed shouldn't have a receipt.)
- Click → `supabase.functions.invoke("generate-receipt", { body: { transaction_id: t.id }, responseType: "blob" })` → create object URL → trigger `<a download>`.
- During fetch: spinner on the row's button, disable while loading, toast on error.
- i18n: `billing.downloadReceipt`, `billing.receiptError`.

## 3. Advanced persistent transaction filters

Replace the current single-row filter UI with a collapsible **"Filters"** panel above the list.

### New filter dimensions

| Filter | Control | Maps to |
|---|---|---|
| Type | Existing chip group (All/Top-ups/Fees/Refunds) | `type` |
| Status | Select: All / Completed / Pending / Failed | `status` |
| Date range | `DateRangePicker` (existing component) — From / To | `created_at` |
| Amount | Two inputs: Min / Max MAD | `Math.abs(amount)` |
| Reference / search | Existing text input | description / reference / type |

- "Clear all" button resets to defaults.
- A small badge on the Filters trigger shows the count of active non-default filters.

### Persistence

- Persist the filter state in **URL query params** so it survives tab switches and reloads:
  - `?tab=transactions&type=topup&status=completed&from=2026-01-01&to=2026-04-30&min=50&max=500&q=ref-abc`
  - Read on mount with `useSearchParams`, write back on every change (debounced 300ms for text/number inputs).
- The active tab itself becomes URL-driven: change `defaultValue="credits"` → controlled `value={params.get("tab") ?? "credits"}` with `onValueChange` updating the URL.
- Apply all filters in the existing `useMemo(filteredTx)` block.

## 4. Confirmed top-up flow

Two-step dialog:

**Step 1 — "Choose amount"** (current dialog content)
- Presets + custom amount input + min-10-MAD validation.
- Footer button: **"Review"** (instead of "Continue to payment").

**Step 2 — "Confirm top-up"**
- Read-only summary card:
  - Amount: `{n} MAD`
  - Method: "YouCan Pay (Card or Cash Plus)"
  - Credits added after success: `+{n} MAD` (1:1 — make this explicit since users asked)
  - New balance preview: `{balance + n} MAD`
  - Note: "Non-refundable platform top-up. Credits never expire."
- Buttons: **Back** (returns to Step 1) and **Confirm & pay** (calls `submitTopup` — same code path).
- Use a `step` local state (`"amount" | "confirm"`); reset to `"amount"` whenever the dialog opens.

### Post-success expected-credits confirmation

- Already toast on `?topup=success`. Enhance:
  - Read the *most recent* `topup` transaction from `renter_wallet_transactions` (already refetched via the realtime hook). 
  - Show a richer toast: `Top-up successful — +{amount} MAD added · New balance {balance_after} MAD`.
  - Also briefly highlight the balance pill in `Header.tsx` (add a `data-pulse` attribute toggled for 2s → CSS pulse on the lime accent). Skip if pill not visible (mobile menu).

---

## i18n keys to add (en/fr/ar)

- `billing.balanceOverTime`, `billing.range7d/30d/90d/all`
- `billing.filters`, `billing.clearAll`, `billing.amountMin`, `billing.amountMax`, `billing.dateFrom`, `billing.dateTo`, `billing.status`, `billing.statusCompleted`, `billing.statusPending`, `billing.statusFailed`
- `billing.downloadReceipt`, `billing.receiptError`, `billing.receiptGenerating`
- `billing.review`, `billing.confirmTopup`, `billing.creditsAdded`, `billing.newBalance`, `billing.topupSuccessFull`, `billing.nonRefundableNote`
- `billing.notRenterTitle`, `billing.notRenterCta`

## Files to create / edit

**Create**
- `supabase/functions/generate-receipt/index.ts`
- `supabase/functions/generate-receipt/deno.json` (with `pdf-lib` import)
- `src/components/billing/BalanceChart.tsx`
- `src/components/billing/TransactionFilters.tsx`
- `src/components/billing/TopupConfirmDialog.tsx` (the 2-step dialog)
- `src/lib/billingFilters.ts` (URL ↔ state codec + filter predicate)

**Edit**
- `src/pages/Billing.tsx` (compose new components, role gate, URL-driven tab, post-success enrichment)
- `src/components/Header.tsx` (transient pulse on balance pill via `data-pulse`)
- `src/locales/en.json`, `fr.json`, `ar.json` (new keys, RTL-safe)

## Out of scope (per your answers)

- ❌ Real saved payment methods / make-default / delete (no card tokenization in MVP)
- ❌ Server-side numbered invoices in a database (receipts are generated on demand; we can revisit if accounting needs an invoice ledger)

---

After your approval I'll implement, deploy the edge function, and verify the chart + receipt download in the preview.
