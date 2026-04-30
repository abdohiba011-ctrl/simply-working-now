import { supabase } from "@/integrations/supabase/client";

export type AccountMethodStatus =
  | "not_found"
  | "oauth_only"
  | "has_password"
  | "unknown";

export interface AccountMethodResult {
  status: AccountMethodStatus;
  primary_provider?: string | null;
}

/**
 * Ask the backend whether an email belongs to:
 *   - no account (not_found)
 *   - an OAuth-only account, e.g. created via Google (oauth_only)
 *   - a normal account that has a password (has_password)
 *
 * Used after a failed login to show a precise, actionable error.
 * Never throws — falls back to "unknown" so the caller can show the
 * generic message rather than crash the UI.
 */
export async function checkAccountMethod(
  email: string,
): Promise<AccountMethodResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "check-account-method",
      { body: { email } },
    );
    if (error || !data) return { status: "unknown" };
    const status = (data as { status?: string }).status;
    if (
      status === "not_found" ||
      status === "oauth_only" ||
      status === "has_password"
    ) {
      return data as AccountMethodResult;
    }
    return { status: "unknown" };
  } catch (e) {
    console.warn("checkAccountMethod failed", e);
    return { status: "unknown" };
  }
}
