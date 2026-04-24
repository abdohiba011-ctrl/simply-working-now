## Plan: Fix checkout payment redirect

The checkout page is failing because the app is redirecting the current preview iframe to the hosted YouCan Pay page, and YouCan Pay refuses to be embedded inside an iframe. That is why the preview shows `youcanpay.com refused to connect`.

### What I will change

1. **Add a shared hosted-payment redirect helper**
   - Create a small utility for payment redirects that handles both:
     - normal live-site navigation
     - preview/iframe-safe navigation
   - The helper will use a popup/new-tab flow for embedded preview contexts instead of navigating the iframe itself.

2. **Fix `src/pages/Checkout.tsx`**
   - Replace `window.location.href = tokenResp.payment_url` with the shared redirect helper.
   - Preserve the current booking creation + payment token flow.
   - Add a clear fallback if the browser blocks the popup/new tab.

3. **Apply the same fix to other payment entry points**
   - `src/pages/agency/Wallet.tsx`
   - `src/pages/agency/Subscription.tsx`
   - These pages use the same direct redirect pattern and can fail the same way in preview.

4. **Add better user feedback**
   - If the payment page must open in a new tab, show a short message/toast so the behavior is clear.
   - If popup opening fails, show a recovery action instead of silently breaking.

5. **Verify the flow after the fix**
   - Checkout: click pay, confirm hosted payment opens correctly.
   - Wallet top-up: confirm hosted payment opens correctly.
   - Subscription upgrade: confirm hosted payment opens correctly.
   - Confirm live-site behavior still navigates normally.

### Technical details

Recommended implementation pattern:

```text
User clicks Pay
  -> open blank window synchronously if app is embedded
  -> request payment token from backend
  -> set popup/new-tab location to hosted payment URL
  -> fallback to normal location redirect when not embedded
```

Why this approach:
- `window.location.href` inside the preview navigates the iframe, which hosted payment pages usually block.
- Opening a window/tab from the user click avoids iframe embedding.
- Doing it through a shared helper keeps checkout, wallet, and subscription consistent.

### Files likely involved
- `src/pages/Checkout.tsx`
- `src/pages/agency/Wallet.tsx`
- `src/pages/agency/Subscription.tsx`
- `src/lib/...` new shared redirect helper

Reply with approval and I’ll implement the fix.