// YouCanPay - create payment token
// Supports purposes: booking_payment, wallet_topup, subscription
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  purpose: "booking_payment" | "wallet_topup" | "subscription";
  amount: number;
  currency?: string;
  related_booking_id?: string | null;
  plan?: "free" | "pro" | "business";
  customer_email?: string;
  customer_name?: string;
  success_path?: string;
  error_path?: string;
}

const APP_URL =
  Deno.env.get("APP_BASE_URL") ||
  "https://simply-working-now.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const PRIVATE_KEY = Deno.env.get("YOUCANPAY_PRIVATE_KEY");
    if (!PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "YOUCANPAY_PRIVATE_KEY not set" }), {
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
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const currency = body.currency || "MAD";

    // Insert pending payment record (cents not used; YouCanPay uses minor units in some flows)
    const { data: payment, error: payErr } = await admin
      .from("youcanpay_payments")
      .insert({
        user_id: user.id,
        purpose: body.purpose,
        amount,
        currency,
        status: "pending",
        related_booking_id: body.related_booking_id || null,
        related_wallet_user_id: body.purpose === "wallet_topup" ? user.id : null,
        customer_email: body.customer_email || user.email || null,
        customer_name: body.customer_name || null,
      })
      .select()
      .single();
    if (payErr) throw payErr;

    // Call YouCanPay sandbox tokenize endpoint
    const orderId = payment.id;
    const defaultSuccess = `${APP_URL}/agency/finance#wallet?yc=success&pid=${orderId}`;
    const defaultError = `${APP_URL}/agency/finance#wallet?yc=error&pid=${orderId}`;
    const buildUrl = (p?: string, fallback?: string) => {
      if (!p) return fallback!;
      const sep = p.includes("?") ? "&" : "?";
      return `${APP_URL}${p}${sep}pid=${orderId}`;
    };
    const successUrl = buildUrl(body.success_path, defaultSuccess);
    const errorUrl = buildUrl(body.error_path, defaultError);
    const webhookUrl = `${SUPABASE_URL}/functions/v1/youcanpay-webhook`;

    const ycPayload = {
      pri_key: PRIVATE_KEY,
      amount: Math.round(amount * 100), // minor units
      currency,
      order_id: orderId,
      customer_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0",
      success_url: successUrl,
      error_url: errorUrl,
      webhook_url: webhookUrl,
      customer: {
        name: body.customer_name || user.email?.split("@")[0] || "Customer",
        email: body.customer_email || user.email,
      },
    };

    const ycResp = await fetch("https://youcanpay.com/sandbox/api/tokenize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ycPayload),
    });
    const ycText = await ycResp.text();
    let ycData: any = {};
    try { ycData = JSON.parse(ycText); } catch { ycData = { raw: ycText }; }

    if (!ycResp.ok || !ycData?.token?.id) {
      await admin
        .from("youcanpay_payments")
        .update({ status: "failed", raw_response: ycData })
        .eq("id", orderId);
      return new Response(
        JSON.stringify({ error: "YouCanPay tokenize failed", details: ycData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenId = ycData.token.id;
    await admin
      .from("youcanpay_payments")
      .update({ token_id: tokenId, raw_response: ycData })
      .eq("id", orderId);

    const payment_url = `https://youcanpay.com/sandbox/${tokenId}`;
    return new Response(
      JSON.stringify({ token_id: tokenId, payment_id: orderId, payment_url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("youcanpay-create-token", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
