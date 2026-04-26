/**
 * Open a hosted payment URL safely.
 *
 * Hosted payment pages (e.g. YouCan Pay) refuse to be embedded in iframes.
 * Inside the Lovable preview iframe, calling `window.location.href = url`
 * navigates the iframe and the payment provider blocks it ("refused to
 * connect"). To work in both preview and live contexts, we:
 *   1. Detect if we're inside an iframe.
 *   2. If so, try to break out via `window.top.location` first.
 *   3. Fallback to opening the URL in a new tab.
 *   4. On the live site (not iframed), navigate normally.
 *
 * For best popup-blocker behavior, callers can pre-open a blank window
 * synchronously on click and pass it as `preOpened`. We'll set its location
 * once the URL is ready.
 */
export function openHostedPayment(
  url: string,
  preOpened?: Window | null,
): { ok: boolean; method: "same-tab" | "top" | "new-tab" | "pre-opened" | "blocked" } {
  if (!url) return { ok: false, method: "blocked" };

  const isEmbedded = (() => {
    try {
      return window.self !== window.top;
    } catch {
      // Cross-origin access throws — definitely embedded.
      return true;
    }
  })();

  // Use the pre-opened window if available (best UX, avoids popup blockers).
  if (preOpened && !preOpened.closed) {
    try {
      preOpened.location.href = url;
      return { ok: true, method: "pre-opened" };
    } catch {
      // fall through
    }
  }

  if (!isEmbedded) {
    window.location.href = url;
    return { ok: true, method: "same-tab" };
  }

  // Embedded: try to escape the iframe first.
  try {
    if (window.top) {
      window.top.location.href = url;
      return { ok: true, method: "top" };
    }
  } catch {
    // Cross-origin top — fall back to a new tab.
  }

  // Inside a sandboxed iframe, window.open often returns a non-null reference
  // that lands on about:blank and never navigates. Treat embedded as blocked
  // so the UI shows a manual "Open payment page" link the user can click.
  if (isEmbedded) {
    return { ok: false, method: "blocked" };
  }

  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) return { ok: true, method: "new-tab" };

  return { ok: false, method: "blocked" };
}

/**
 * Open a blank window synchronously from a user click. Use the returned
 * window with `openHostedPayment(url, preOpened)` once the URL is ready.
 */
export function preOpenPaymentWindow(): Window | null {
  // Detect iframe — pre-opening from inside a sandboxed preview iframe
  // tends to land on about:blank with no way to navigate it cross-origin.
  // Skip pre-open in that case so the caller falls back to a manual link.
  let isEmbedded = false;
  try {
    isEmbedded = window.self !== window.top;
  } catch {
    isEmbedded = true;
  }
  if (isEmbedded) return null;

  try {
    // IMPORTANT: do NOT pass "noopener" here — that returns null and we
    // lose the reference needed to set location.href later.
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}
