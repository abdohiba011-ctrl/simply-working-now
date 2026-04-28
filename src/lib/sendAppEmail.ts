import { supabase } from "@/integrations/supabase/client";

/**
 * Send a Motonita transactional email through the secure edge function.
 *
 * The RESEND_API_KEY lives only on the server (edge function env). The
 * frontend never sees it — we just invoke the function via the user's
 * Supabase session.
 *
 * Available templates (server-side):
 *  - "welcome"
 *  - "booking-confirmation"
 *  - "admin-booking-notification"
 *  - "provider-notification"
 *  - "booking-status-update"
 *  - "admin-test"
 */
export type AppEmailTemplate =
  | "welcome"
  | "booking-confirmation"
  | "admin-booking-notification"
  | "provider-notification"
  | "booking-status-update"
  | "admin-test";

export interface SendAppEmailArgs {
  templateName: AppEmailTemplate;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
}

export async function sendAppEmail({
  templateName,
  recipientEmail,
  templateData = {},
}: SendAppEmailArgs): Promise<{ success: boolean; id?: string | null; reason?: string }> {
  const { data, error } = await supabase.functions.invoke(
    "send-transactional-email",
    {
      body: {
        templateName,
        recipientEmail,
        templateData,
      },
    },
  );

  if (error) {
    console.error("sendAppEmail failed", { templateName, error });
    return { success: false, reason: error.message };
  }
  return data as { success: boolean; id?: string | null; reason?: string };
}
