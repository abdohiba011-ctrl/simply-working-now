// YouCan Pay - manual payment verification fallback.
//
// Called from the PaymentStatus page (or admin recovery widget) when the
// webhook hasn't arrived. We poll YouCan's transaction API directly using
// the stored token_id, then run the same credit/update logic as the webhook.
//
// Auth: requires logged-in user; only the payment owner or an admin can verify.
// Idempotency: if status is already "paid", returns early without re-crediting.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  payment_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const PRIVATE_KEY = Deno.env.get("YOUCANPAY_PRIVATE_KEY") || "";
    const PUBLIC_KEY = Deno.env.get("YOUCANPAY_PUBLIC_KEY") || "";

    if (!PRIVATE_KEY || !PUBLIC_KEY) {
      return new Response(JSON.stringify({ error: "YouCan Pay keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.payment_id) {
      return new Response(JSON.stringify({ error: "Missing payment_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load payment
    const { data: payment, error: payErr } = await admin
      .from("youcanpay_payments")
      .select("*")
      .eq("id", body.payment_id)
      .maybeSingle();
    if (payErr) throw payErr;
    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: owner or admin only
    let isAdmin = false;
    {
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }
    if (payment.user_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already paid? Idempotent no-op.
    if (payment.status === "paid") {
      return new Response(JSON.stringify({ status: "paid", payment, already: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick endpoint based on key environment.
    const isSandboxKey = PUBLIC_KEY.startsWith("pub_sandbox_");
    const baseUrl = isSandboxKey
      ? "https://youcanpay.com/sandbox/api"
      : "https://youcanpay.com/api";

    // YouCan Pay does not expose a token-status endpoint publicly. The
    // closest reliable check is the transaction lookup once we have a
    // transaction_id, which the webhook normally fills. If we don't have
    // one yet, we fall back to a tokenize-status probe.
    let providerStatus: string | null = null;
    let providerTxn: string | null = payment.transaction_id || null;
    let providerRaw: any = null;

    const tryFetch = async (url: string, init: RequestInit) => {
      try {
        const r = await fetch(url, init);
        const t = await r.text();
        let j: any = {};
        try { j = JSON.parse(t); } catch { j = { raw: t }; }
        return { ok: r.ok, status: r.status, body: j };
      } catch (e: any) {
        return { ok: false, status: 0, body: { error: e?.message || String(e) } };
      }
    };

    if (providerTxn) {
      const r = await tryFetch(`${baseUrl}/transactions/${providerTxn}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PRIVATE_KEY}`,
        },
      });
      providerRaw = r.body;
      const s = (r.body?.status || r.body?.transaction?.status || "").toString().toLowerCase();
      if (s) providerStatus = s;
    }

    // Fallback: query the token, which may include a status field once paid.
    if (!providerStatus && payment.token_id) {
      const r = await tryFetch(`${baseUrl}/tokens/${payment.token_id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PRIVATE_KEY}`,
        },
      });
      providerRaw = providerRaw || r.body;
      const s = (
        r.body?.status ||
        r.body?.token?.status ||
        r.body?.transaction?.status ||
        ""
      ).toString().toLowerCase();
      if (s) providerStatus = s;
      const txn = r.body?.transaction_id || r.body?.transaction?.id || null;
      if (txn) providerTxn = txn;
    }

    console.log("youcanpay-verify-payment lookup", JSON.stringify({
      payment_id: payment.id,
      providerStatus,
      providerTxn,
      isSandboxKey,
    }));

    const isPaid = ["paid", "success", "successful", "completed"].includes(
      providerStatus || "",
    );
    const isFailed = ["failed", "error", "cancelled", "canceled", "refused", "declined"].includes(
      providerStatus || "",
    );

    if (!isPaid && !isFailed) {
      return new Response(
        JSON.stringify({
          status: "pending",
          provider_status: providerStatus,
          payment,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update our row
    await admin
      .from("youcanpay_payments")
      .update({
        status: isPaid ? "paid" : "failed",
        transaction_id: providerTxn,
        paid_at: isPaid ? new Date().toISOString() : null,
        raw_response: providerRaw,
      })
      .eq("id", payment.id);

    if (!isPaid) {
      const { data: updated } = await admin
        .from("youcanpay_payments")
        .select("*")
        .eq("id", payment.id)
        .maybeSingle();
      return new Response(JSON.stringify({ status: "failed", payment: updated }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply business effects (mirrors youcanpay-webhook).
    if (payment.purpose === "renter_topup" && (payment.related_wallet_user_id || payment.user_id)) {
      const userId = payment.related_wallet_user_id || payment.user_id;
      const { error: creditErr } = await admin.rpc("credit_renter_wallet", {
        _user_id: userId,
        _amount: Number(payment.amount),
        _payment_id: payment.id,
        _method: "youcanpay",
        _reference: providerTxn,
        _description: "Credits top up (verified)",
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
        description: "Wallet top up (verified)",
        reference: providerTxn,
        related_payment_id: payment.id,
      });
    } else if (payment.purpose === "subscription" && payment.user_id) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await admin.from("agency_subscriptions").upsert(
        {
          user_id: payment.user_id,
          plan: "pro",
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
        .select("user_id, assigned_to_business, customer_name, bike_id")
        .eq("id", payment.related_booking_id)
        .maybeSingle();

      await admin
        .from("bookings")
        .update({ payment_status: "paid" })
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
        external_reference: providerTxn,
      });

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

    const { data: updated } = await admin
      .from("youcanpay_payments")
      .select("*")
      .eq("id", payment.id)
      .maybeSingle();

    return new Response(JSON.stringify({ status: "paid", payment: updated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("youcanpay-verify-payment", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
