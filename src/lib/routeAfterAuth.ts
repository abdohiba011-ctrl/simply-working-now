import type { NavigateFunction } from "react-router-dom";
import type { MockUser } from "@/lib/mockAuth";

export type LoginContext = "renter" | "agency";

const BECOME_BUSINESS_FLAG = "motonita_show_become_business";

export function queueBecomeBusinessPrompt(): void {
  try {
    sessionStorage.setItem(BECOME_BUSINESS_FLAG, "1");
  } catch {
    // ignore
  }
}

export function consumeBecomeBusinessPrompt(): boolean {
  try {
    const v = sessionStorage.getItem(BECOME_BUSINESS_FLAG);
    if (v) sessionStorage.removeItem(BECOME_BUSINESS_FLAG);
    return v === "1";
  } catch {
    return false;
  }
}

/**
 * Decide where to send the user after they authenticate or land on an
 * auth-entry page while already authenticated.
 *
 * - If the user has only one role active, they go there.
 * - If they have both roles, the login `context` (which "door" they used)
 *   wins. Without a context, we fall back to last_active_role then to the
 *   business-priority rule.
 * - If their email is not verified, they go to /verify-email.
 */
export function getDestinationForUser(
  user: MockUser,
  context?: LoginContext,
): string {
  if (!user.email_verified) return "/verify-email";

  const hasRenter = user.roles.renter.active;
  const hasAgency = user.roles.agency.active;

  // Single-role users always go to their only home.
  if (hasAgency && !hasRenter) {
    return user.roles.agency.verified
      ? "/agency/dashboard"
      : "/agency/verification";
  }
  if (hasRenter && !hasAgency) return "/rent";

  // Dual-role: context wins.
  if (hasRenter && hasAgency) {
    let chosen: LoginContext;
    if (context === "agency") chosen = "agency";
    else if (context === "renter") chosen = "renter";
    else if (user.last_active_role === "renter") chosen = "renter";
    else chosen = "agency"; // business-priority default

    if (chosen === "agency") {
      return user.roles.agency.verified
        ? "/agency/dashboard"
        : "/agency/verification";
    }
    return "/rent";
  }

  // No active roles — fallback to renter.
  return "/rent";
}

export function navigateAfterAuth(
  navigate: NavigateFunction,
  user: MockUser,
  context?: LoginContext,
): void {
  navigate(getDestinationForUser(user, context), { replace: true });
}
