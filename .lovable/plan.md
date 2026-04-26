## Goal
Make renter credit top-ups actually work against the YouCan Pay **sandbox** so you can test the full flow: click "Top up" → pay on YouCan's sandbox page → return to `/billing` → balance updates → receipt downloadable.

## Issues found in current code

1. **Wrong tokenize payload shape.** The sandbox endpoint expects both `pub_key` and `pri_key` (and a few other field names). The current code only sends `pri_key`, which is why every tokenize call silently fails.
2. **Wrong hosted-page URL.** Code uses `https://youcanpay.com/sandbox/${tokenId}`. The actual sandbox checkout URL is `https://pay.youcan.shop/sandbox/${tokenId}`.
3. **Renter top-ups redirect to the agency wallet page** (`/agency/finance#wallet`). The defaults must point to `/billing` for renter flows; right now only the `success_path`/`error_path` overrides save us — the defaults are misleading and break if a caller forgets to pass them.
4. **Webhook never tells you which model triggered it.** When YouCan posts back, we update the payment row but if the body is empty (sandbox sometimes posts form-encoded), the JSON parse silently returns `{}` and we 400. Need to accept both `application/json` and `application/x-www-form-urlencoded`.
5. **Sandbox webhooks won't reach `localhost`/`id-preview`** but the current `webhook_url` is built from `SUPABASE_URL` (the project's `*.supabase.co` host) — that's correct, so this is fine, just confirming.
6. **Public key not exposed.** `YOUCANPAY_PUBLIC_KEY` is already configured as a secret — we just need to read it in the edge function.

## Changes

### 1. `supabase/functions/youcanpay-create-token/index.ts`
- Read `YOUCANPAY_PUBLIC_KEY` alongside `YOUCANPAY_PRIVATE_KEY`; 500 if either missing.
- Send the correct sandbox tokenize payload:
  ```ts
  {
    pub_key: PUBLIC_KEY,
    pri_key: PRIVATE_KEY,
    amount: Math.round(amount * 100),
    currency,
    order_id: orderId,
    customer_ip,
    success_url, error_url, webhook_url,
    customer: { name, email },
  }
  ```
- Change checkout URL to `https://pay.youcan.shop/sandbox/${tokenId}`.
- Change defaults so renter top-ups land on `/billing?topup=success|error` when `purpose === "renter_topup"` and no path is provided. Keep agency defaults pointing at `/agency/finance#wallet` for `wallet_topup`.
- Better error logging: log the YouCan response body when tokenize fails so we can see exactly what the sandbox rejects.

### 2. `supabase/functions/youcanpay-webhook/index.ts`
- Parse both JSON and `application/x-www-form-urlencoded` request bodies (sandbox posts can be either).
- Log the raw payload + parsed `orderId/status` so we can debug from edge function logs.
- Keep all existing credit logic (`credit_renter_wallet` RPC, agency wallet, subscription, booking) — that part is correct.

### 3. Sandbox test card reminder in UI
Add a small helper line in `src/components/billing/TopupConfirmDialog.tsx` (only visible while we're on the sandbox host) telling you to use YouCan's sandbox test card:
- Card: `4242 4242 4242 4242`
- Expiry: any future date
- CVC: any 3 digits

Plain text, dismissible, no design overhaul.

### 4. Manual verification steps after deploy
1. Open `/billing`, click **Top up credits**, pick 50 MAD, confirm.
2. New tab opens at `pay.youcan.shop/sandbox/...`. Pay with the test card above.
3. Tab redirects to `/billing?topup=success`, toast shows "+50.00 MAD added", header pill updates, transaction appears in **Transactions** with status `completed`.
4. Click the download icon → branded PDF receipt downloads.
5. Trigger a failure (close tab, or use card `4000000000000002`) and confirm the error toast + `failed` transaction status.

## What I will NOT do
- Won't switch to YouCan Pay **production** — sandbox keys only, as you requested.
- Won't touch agency wallet, subscription, or booking-fee flows beyond the webhook body-parser fix (they share the same function).
- Won't add saved cards / tokenization-on-file (out of scope, and YouCan Pay sandbox doesn't expose card-on-file in your account).
