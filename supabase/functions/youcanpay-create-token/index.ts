// YouCanPay - create payment token (sandbox)
// Supports purposes: booking_payment, wallet_topup, subscription, renter_topup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  purpose: "booking_payment" | "wallet_topup" | "subscription" | "renter_topup";
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
    const PUBLIC_KEY = Deno.env.get("YOUCANPAY_PUBLIC_KEY");
    if (!PRIVATE_KEY || !PUBLIC_KEY) {
      return new Response(
        JSON.stringify({
          error: "YouCan Pay keys not configured",
          missing: {
            YOUCANPAY_PRIVATE_KEY: !PRIVATE_KEY,
            YOUCANPAY_PUBLIC_KEY: !PUBLIC_KEY,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    // Insert pending payment record
    const { data: payment, error: payErr } = await admin
      .from("youcanpay_payments")
      .insert({
        user_id: user.id,
        purpose: body.purpose,
        amount,
        currency,
        status: "pending",
        related_booking_id: body.related_booking_id || null,
        related_wallet_user_id:
          body.purpose === "wallet_topup" || body.purpose === "renter_topup" ? user.id : null,
        customer_email: body.customer_email || user.email || null,
        customer_name: body.customer_name || null,
      })
      .select()
      .single();
    if (payErr) throw payErr;

    const orderId = payment.id;

    // Default redirect URLs depend on caller. Renter top-ups land on /billing,
    // agency wallet/sub flows land on /agency/finance#wallet.
    const isRenterFlow = body.purpose === "renter_topup";
    const defaultSuccess = isRenterFlow
      ? `${APP_URL}/billing?topup=success&pid=${orderId}`
      : `${APP_URL}/agency/finance#wallet?yc=success&pid=${orderId}`;
    const defaultError = isRenterFlow
      ? `${APP_URL}/billing?topup=error&pid=${orderId}`
      : `${APP_URL}/agency/finance#wallet?yc=error&pid=${orderId}`;
    const buildUrl = (p?: string, fallback?: string) => {
      if (!p) return fallback!;
      const sep = p.includes("?") ? "&" : "?";
      return `${APP_URL}${p}${sep}pid=${orderId}`;
    };
    const successUrl = buildUrl(body.success_path, defaultSuccess);
    const errorUrl = buildUrl(body.error_path, defaultError);
    const webhookUrl = `${SUPABASE_URL}/functions/v1/youcanpay-webhook`;

    // YouCan Pay sandbox tokenize payload — REQUIRES both pub_key and pri_key.
    const ycPayload = {
      pub_key: PUBLIC_KEY,
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
      console.error("YouCanPay tokenize failed", {
        status: ycResp.status,
        body: ycData,
        sentAmount: ycPayload.amount,
        currency,
        orderId,
      });
      await admin
        .from("youcanpay_payments")
        .update({ status: "failed", raw_response: ycData })
        .eq("id", orderId);
      return new Response(
        JSON.stringify({
          error: "YouCanPay tokenize failed",
          status: ycResp.status,
          details: ycData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenId = ycData.token.id;
    await admin
      .from("youcanpay_payments")
      .update({ token_id: tokenId, raw_response: ycData })
      .eq("id", orderId);

    // YouCan Pay does NOT expose a hosted-redirect URL on its public API.
    // The official integration is to embed `ycpay.js` in our own page and
    // call `ycPay.pay(tokenId)` from a button. We return the token + public
    // key so the frontend can render the embedded form.
    const isSandbox = PUBLIC_KEY.startsWith("pub_sandbox_");
    return new Response(
      JSON.stringify({
        token_id: tokenId,
        payment_id: orderId,
        public_key: PUBLIC_KEY,
        is_sandbox: isSandbox,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("youcanpay-create-token", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
