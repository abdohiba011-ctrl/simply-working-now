import type { NavigateFunction } from "react-router-dom";
import type { MockUser } from "@/lib/mockAuth";

export type LoginContext = "renter" | "agency";

/**
 * Lightweight audit hook. Logs to the console (always) and best-effort
 * persists to `audit_logs` so we can later confirm that agency users were
 * never routed to /rent. Never throws — auth must keep working even if
 * the audit insert fails.
 */
function auditAuthRouting(
  user: MockUser,
  context: LoginContext | undefined,
  destination: string,
): void {
  const hasAgency = !!user.roles.agency.active;
  const hasRenter = !!user.roles.renter.active;
  const violation = hasAgency && destination.startsWith("/rent");

  // eslint-disable-next-line no-console
  console.info("[auth-route]", {
    userId: user.id,
    context: context ?? null,
    hasAgency,
    hasRenter,
    destination,
    violation,
  });

  if (violation) {
    // eslint-disable-next-line no-console
    console.error(
      "[auth-route] VIOLATION: agency user routed to renter area",
      { userId: user.id, destination },
    );
  }

  // Fire-and-forget audit insert. Imported lazily so this module stays
  // tree-shakeable in tests that don't touch Supabase.
  void (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.rpc("log_audit_event", {
        _action: violation ? "auth_route_violation" : "auth_route_decision",
        _table_name: "auth",
        _record_id: user.id,
        _details: {
          context: context ?? null,
          destination,
          has_agency: hasAgency,
          has_renter: hasRenter,
        } as Record<string, unknown>,
      });
    } catch {
      // ignore — auditing must never break login
    }
  })();
}

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

  // Agency users are agency-only. They always land on the agency
  // dashboard (or verification screen), regardless of which login door
  // they used. They never get sent to /rent.
  if (hasAgency) {
    return user.roles.agency.verified
      ? "/agency/dashboard"
      : "/agency/verification";
  }

  // Renter-only accounts go to the renter home.
  if (hasRenter) return "/rent";

  // No active roles — fallback to renter.
  return "/rent";
}

export function navigateAfterAuth(
  navigate: NavigateFunction,
  user: MockUser,
  context?: LoginContext,
): void {
  const dest = getDestinationForUser(user, context);
  auditAuthRouting(user, context, dest);
  navigate(dest, { replace: true });
}
