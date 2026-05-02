// YouCanPay webhook receiver — confirms payments, credits wallets,
// updates subscriptions and bookings.
//
// Security: verifies HMAC-SHA256 signature using YOUCANPAY_PRIVATE_KEY when
// YouCan Pay sends a signature header. Sandbox webhooks do not currently send
// a signing secret/header, so unsigned sandbox events are accepted and logged.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-youcan-signature, x-youcanpay-signature, x-ycp-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PRIVATE_KEY = Deno.env.get("YOUCANPAY_PRIVATE_KEY") || "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Read raw body once so we can verify the signature against the exact bytes.
    const rawBody = await req.text();
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    const sourceIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const sigHeader =
      req.headers.get("x-youcan-signature") ||
      req.headers.get("x-youcanpay-signature") ||
      req.headers.get("x-ycp-signature") ||
      "";

    let payload: Record<string, any> = {};
    try {
      if (contentType.includes("application/json")) {
        payload = rawBody ? JSON.parse(rawBody) : {};
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const sp = new URLSearchParams(rawBody);
        sp.forEach((v, k) => { payload[k] = v; });
      } else {
        try { payload = JSON.parse(rawBody); }
        catch {
          try {
            const sp = new URLSearchParams(rawBody);
            sp.forEach((v, k) => { payload[k] = v; });
          } catch { payload = { raw: rawBody }; }
        }
      }
    } catch (e) {
      console.error("youcanpay-webhook body parse failed", e);
    }

    // Diagnostic log — helps confirm whether YouCan is actually reaching us.
    console.log("youcanpay-webhook hit", JSON.stringify({
      sourceIp,
      contentType,
      hasSigHeader: !!sigHeader,
      payloadKeys: Object.keys(payload),
      eventName: payload.event_name || payload.event || null,
      orderId: payload.order_id || payload.orderId || payload.payload?.transaction?.order_id || null,
      transactionId: payload.transaction_id || payload.transactionId || payload.payload?.transaction?.id || null,
      status: payload.status || payload.payload?.transaction?.status || null,
    }));

    // Verify signature when YouCan Pay supplies one. Their documented sandbox
    // webhook payload includes `sandbox: true` but no signing secret/header in
    // dashboard setup, so accept unsigned sandbox events after logging them.
    const insecure = Deno.env.get("YOUCANPAY_WEBHOOK_INSECURE") === "1";
    const isSandboxWebhook = payload.sandbox === true;
    let signatureOk = false;
    if (PRIVATE_KEY && rawBody) {
      const expected = await hmacSha256Hex(PRIVATE_KEY, rawBody);
      const candidate = (sigHeader || payload.signature || "").toString().toLowerCase();
      if (candidate && timingSafeEqual(expected.toLowerCase(), candidate)) {
        signatureOk = true;
      }
    }
    if (!signatureOk && !isSandboxWebhook && !insecure) {
      console.warn("youcanpay-webhook signature mismatch", {
        sourceIp,
        receivedSig: sigHeader ? sigHeader.slice(0, 12) + "…" : "(none)",
      });
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!signatureOk && isSandboxWebhook) {
      console.warn("youcanpay-webhook accepted unsigned sandbox event", {
        sourceIp,
        eventName: payload.event_name || null,
      });
    }

    // YouCanPay typically sends order_id, transaction_id, status
    const transaction = payload.payload?.transaction || {};
    const orderId = payload.order_id || payload.orderId || payload.metadata?.order_id || transaction.order_id;
    const transactionId = payload.transaction_id || payload.transactionId || transaction.id || null;
    const rawStatus = payload.status ?? transaction.status ?? payload.event_name ?? payload.event ?? "";
    const status = rawStatus === 1 ? "paid" : rawStatus === 0 ? "pending" : rawStatus.toString().toLowerCase();

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

    // Idempotency — once paid, never re-process credits/inserts.
    if (payment.status === "paid") {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    if (payment.purpose === "renter_topup" && (payment.related_wallet_user_id || payment.user_id)) {
      const userId = payment.related_wallet_user_id || payment.user_id;
      const { error: creditErr } = await admin.rpc("credit_renter_wallet", {
        _user_id: userId,
        _amount: Number(payment.amount),
        _payment_id: payment.id,
        _method: "youcanpay",
        _reference: transactionId,
        _description: "Credits top up",
      });
      if (creditErr) console.error("credit_renter_wallet error", creditErr);
    } else if (payment.purpose === "wallet_topup" && payment.related_wallet_user_id) {
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
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await admin.from("agency_subscriptions").upsert(
        {
          user_id: payment.user_id,
          plan: (payload.plan as string) || "pro",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          last_payment_id: payment.id,
        },
        { onConflict: "user_id" },
      );
    } else if (payment.purpose === "booking_payment" && payment.related_booking_id) {
      // Mark booking platform fee as paid. The 10 MAD platform fee is tracked
      // separately from the rental price (which is paid off-platform to the agency).
      const { data: booking } = await admin
        .from("bookings")
        .select("user_id, assigned_to_business, customer_name, bike_id")
        .eq("id", payment.related_booking_id)
        .maybeSingle();

      await admin
        .from("bookings")
        .update({
          payment_status: "paid",
        })
        .eq("id", payment.related_booking_id);

      await admin.from("booking_payments").insert({
        booking_id: payment.related_booking_id,
        amount: payment.amount,
        currency: payment.currency,
        provider: "youcanpay",
        method: "card",
        payment_type: "platform_fee",
        status: "completed",
        paid_at: new Date().toISOString(),
        external_reference: transactionId,
      });

      // Notify the agency (if assigned).
      if (booking?.assigned_to_business) {
        await admin.from("notifications").insert({
          user_id: booking.assigned_to_business,
          title: "New booking request",
          message: `${booking.customer_name || "A customer"} just paid the booking fee. Please contact them within 24 hours to confirm.`,
          type: "booking",
          link: `/agency/bookings/${payment.related_booking_id}`,
          action_url: `/agency/bookings/${payment.related_booking_id}`,
        });
      }
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
