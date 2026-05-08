## Two fixes on the YouCan Pay card screen (`src/pages/PayYouCan.tsx`)

### 1. Prefill cardholder name and email from the renter's info

**Today**
- Checkout already sends `customer_name` (full name from profile) and `customer_email` to `youcanpay-create-token`, which forwards them to YouCan's `tokenize` API. Good for billing/server-side.
- The embedded card form rendered by `ycpay.js` into `#ycpay-form` still asks the user to type *Cardholder name* and *Email* — those input fields appear empty. The user has to re-enter info Motonita already has.

**Fix**
- Pass the same name/email to PayYouCan via two new query params: `holder` and `email` (URL-encoded). Updated in `Checkout.tsx` and `CheckoutDraft.tsx` where the navigation to `/pay/youcan?...` is built.
- In `PayYouCan.tsx`, after `renderCreditCardForm("default")` resolves, run a small post-render routine that:
  1. Queries `#ycpay-form` for the cardholder-name and email inputs. YouCan's SDK uses stable selectors (`input[name="card_holder_name"]`, `input[name="card_holder_email"]` — also try `name*="holder"` / `type="email"` as fallback).
  2. Sets `value`, then dispatches a native `input` + `change` event so the SDK's internal state picks the value up.
  3. Adds `readOnly` styling (lighter background, lock icon hint via class) so the user knows these came from their account but can still focus to edit if needed.
  4. Polls up to ~1.5 s (every 100 ms) because the SDK paints the form async.
- If selectors don't match in a future SDK version, fall back silently — no crash, no toast — the user types as today.
- Also pass the same prefill into the SDK constructor under a non-breaking `customer` key in case YouCan honors it natively; ignored if not.

A small "Cardholder name and email are pre-filled from your Motonita account. Card number, expiry and CVV are entered securely on YouCan Pay." note is shown above the form.

### 2. Stop the duplicate / crash on repeat clicks of "Debit / Credit card"

**Root causes (verified by reading the file)**
- `useEffect` deps include `token, pubKey, isSandbox, method`. In React 18 StrictMode dev, the effect runs twice on mount → `new YCPay(...)` runs twice → the SDK paints the credit-card form into `#ycpay-form` twice → users see two cardholder/expiry/CVV blocks, and the second `pay()` call fights the first.
- If the user clicks the method tab on the previous Checkout step rapidly, the navigation can also re-mount this page before the previous YCPay instance is GC'd.
- `handlePay` doesn't guard against double-clicks while `status === "paying"`. The disabled prop is set, but `setStatus("paying")` is async, so the first click can still trigger two `yc.pay(token)` calls under heavy event timing → "duplicate" submission.
- The cleanup function only sets `cancelled = true`; it never empties `#ycpay-form` or destroys the previous `YCPay` instance.

**Fix**
- Add an `initStartedRef = useRef(false)` guard inside the effect. Bail out if it's already true. Reset to false in cleanup only when the deps actually change.
- In cleanup: clear the form container (`document.getElementById("ycpay-form")!.innerHTML = ""`), null out `ycRef.current`, and call any disposer the SDK exposes (`yc.destroy?.()`, swallow if missing).
- In `handlePay`: bail out if `status !== "ready"` *or* if a `payingRef.current` flag is true. Set the flag synchronously before calling `yc.pay()`, clear it in `.finally`. This makes the second click a no-op even if React hasn't repainted yet.
- Wrap `new YCPay(...)` and `renderCreditCardForm` in a try/catch. On failure, set status to `error` with a friendly message ("We couldn't load the card form. Tap Retry to try again.") and show a Retry button that re-runs init without forcing a full page reload.
- Use a separate fresh container for re-init: before each init, replace `#ycpay-form`'s child nodes so previously-rendered SDK markup can't survive a hot remount.
- Same guards applied to the cashplus branch since it shares the effect.

### Out of scope
- Touching YouCan's hosted card iframe internals beyond setting input values via DOM events.
- Storing card data ourselves (PCI). All sensitive fields stay inside YouCan's form.
- Translation strings — reuse English defaults; add only a single short prefill notice.

### Files to edit
- `src/pages/PayYouCan.tsx` — prefill routine, init/destroy guards, double-click guard, error retry.
- `src/pages/Checkout.tsx` — add `holder` + `email` to the `/pay/youcan?...` URL when navigating to card payment.
- `src/pages/CheckoutDraft.tsx` — same URL change in any branch that navigates to `/pay/youcan`.

No DB migrations, no edge-function changes.
