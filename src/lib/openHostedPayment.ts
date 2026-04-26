/**
 * Build the in-app YouCan Pay checkout URL.
 *
 * YouCan Pay does NOT expose a hosted-redirect URL on its public API.
 * The official integration is to embed `ycpay.js` in our own page and
 * call `ycPay.pay(tokenId)` from a button. We send users to a dedicated
 * route (`/pay/youcanpay`) that does exactly that — no popups, no iframes,
 * no external 404s.
 */
export interface YouCanTokenResponse {
  token_id: string;
  payment_id: string;
  public_key: string;
  is_sandbox?: boolean;
}

export interface BuildPayUrlOptions {
  resp: YouCanTokenResponse;
  amount: number | string;
  currency?: string;
  successPath: string;
  errorPath: string;
  title?: string;
}

export function buildYouCanPayUrl(opts: BuildPayUrlOptions): string {
  const { resp, amount, currency = "MAD", successPath, errorPath, title } = opts;
  const qs = new URLSearchParams({
    token: resp.token_id,
    pubKey: resp.public_key,
    pid: resp.payment_id,
    amount: String(amount),
    currency,
    sandbox: resp.is_sandbox ? "1" : "0",
    success: successPath,
    error: errorPath,
  });
  if (title) qs.set("title", title);
  return `/pay/youcanpay?${qs.toString()}`;
}
