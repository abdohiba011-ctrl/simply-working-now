// YouCanPay webhook receiver — confirms payments, credits wallets,
// updates subscriptions and bookings.
//
// SECURITY:
// - If the YOUCANPAY_WEBHOOK_SECRET secret is configured, every incoming
//   request MUST present a matching HMAC-SHA256 signature in the
//   `x-youcanpay-signature` header (computed over the raw request body).
//   Requests without a valid signature are rejected with 403.
// - The subscription `plan` is read from the trusted `youcanpay_payments`
//   row (raw_response stored at token creation time) — NEVER from the
//   incoming webhook payload — to prevent free upgrades to paid tiers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-youcanpay-signature",
};

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WEBHOOK_SECRET = Deno.env.get("YOUCANPAY_WEBHOOK_SECRET");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Read the raw body once so we can verify the signature, then parse JSON.
    const rawBody = await req.text();

    if (WEBHOOK_SECRET) {
      const provided = (req.headers.get("x-youcanpay-signature") || "")
        .replace(/^sha256=/i, "")
        .trim()
        .toLowerCase();
      const expected = (await hmacSha256Hex(WEBHOOK_SECRET, rawBody)).toLowerCase();
      if (!provided || !timingSafeEqual(provided, expected)) {
        console.warn("youcanpay-webhook: invalid signature");
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn(
        "youcanpay-webhook: YOUCANPAY_WEBHOOK_SECRET is not set — webhook signature verification is DISABLED. Configure it in Supabase secrets to enable signature verification.",
      );
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = {};
    }
    console.log("youcanpay-webhook payload:", JSON.stringify(payload));

    // YouCanPay typically sends order_id, transaction_id, status
    const orderId =
      (payload as any).order_id ||
      (payload as any).orderId ||
      (payload as any).metadata?.order_id;
    const transactionId =
      (payload as any).transaction_id || (payload as any).transactionId || null;
    const status = ((payload as any).status || (payload as any).event || "")
      .toString()
      .toLowerCase();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "missing order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment } = await admin
      .from("youcanpay_payments")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!payment) {
      return new Response(JSON.stringify({ error: "payment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPaid = ["paid", "success", "successful", "completed"].includes(status);
    const isFailed = ["failed", "error", "cancelled", "canceled"].includes(status);

    await admin
      .from("youcanpay_payments")
      .update({
        status: isPaid ? "paid" : isFailed ? "failed" : payment.status,
        transaction_id: transactionId,
        paid_at: isPaid ? new Date().toISOString() : null,
        raw_response: payload,
      })
      .eq("id", orderId);

    if (!isPaid) {
      return new Response(JSON.stringify({ ok: true, status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit/apply based on purpose
    if (payment.purpose === "wallet_topup" && payment.related_wallet_user_id) {
      const userId = payment.related_wallet_user_id;
      const { data: wallet } = await admin
        .from("agency_wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const current = Number(wallet?.balance || 0);
      const newBalance = current + Number(payment.amount);

      if (wallet) {
        await admin.from("agency_wallets").update({ balance: newBalance }).eq("id", wallet.id);
      } else {
        await admin.from("agency_wallets").insert({ user_id: userId, balance: newBalance });
      }

      await admin.from("agency_wallet_transactions").insert({
        user_id: userId,
        type: "topup",
        amount: payment.amount,
        balance_after: newBalance,
        currency: payment.currency,
        status: "completed",
        method: "youcanpay",
        description: "Wallet top up",
        reference: transactionId,
        related_payment_id: payment.id,
      });
    } else if (payment.purpose === "subscription" && payment.user_id) {
      // SECURITY: Read the plan from the trusted payment record (set at
      // token creation time), NEVER from the unverified webhook payload.
      const trustedRaw = (payment.raw_response || {}) as Record<string, unknown>;
      const trustedPlan =
        (trustedRaw.requested_plan as string) ||
        (trustedRaw.plan as string) ||
        "pro";
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await admin.from("agency_subscriptions").upsert(
        {
          user_id: payment.user_id,
          plan: trustedPlan,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          last_payment_id: payment.id,
        },
        { onConflict: "user_id" },
      );
    } else if (payment.purpose === "booking_payment" && payment.related_booking_id) {
      const { data: booking } = await admin
        .from("bookings")
        .select("amount_paid, total_price")
        .eq("id", payment.related_booking_id)
        .maybeSingle();
      const newPaid = Number(booking?.amount_paid || 0) + Number(payment.amount);
      const total = Number(booking?.total_price || 0);
      await admin
        .from("bookings")
        .update({
          amount_paid: newPaid,
          payment_status: newPaid >= total && total > 0 ? "paid" : "partial",
        })
        .eq("id", payment.related_booking_id);

      await admin.from("booking_payments").insert({
        booking_id: payment.related_booking_id,
        amount: payment.amount,
        currency: payment.currency,
        provider: "youcanpay",
        method: "card",
        status: "completed",
        paid_at: new Date().toISOString(),
        external_reference: transactionId,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("youcanpay-webhook", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
