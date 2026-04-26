// YouCanPay webhook receiver — confirms payments, credits wallets,
// updates subscriptions and bookings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // YouCan Pay sandbox can post either JSON or form-encoded bodies.
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    let payload: Record<string, any> = {};
    try {
      if (contentType.includes("application/json")) {
        payload = await req.json();
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const form = await req.formData();
        for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : String(v);
      } else {
        // Fallback: try JSON, then raw text.
        const raw = await req.text();
        try { payload = JSON.parse(raw); }
        catch {
          // Try urlencoded as a last resort
          try {
            const sp = new URLSearchParams(raw);
            sp.forEach((v, k) => { payload[k] = v; });
          } catch { payload = { raw }; }
        }
      }
    } catch (e) {
      console.error("youcanpay-webhook body parse failed", e);
    }
    console.log("youcanpay-webhook payload:", JSON.stringify(payload), "content-type:", contentType);

    // YouCanPay typically sends order_id, transaction_id, status
    const orderId = payload.order_id || payload.orderId || payload.metadata?.order_id;
    const transactionId = payload.transaction_id || payload.transactionId || null;
    const status = (payload.status || payload.event || "").toString().toLowerCase();

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
