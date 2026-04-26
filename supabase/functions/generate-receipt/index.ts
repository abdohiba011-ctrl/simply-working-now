// Generate a PDF receipt for a renter wallet transaction.
// Auth: caller must be the transaction owner OR an admin.
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fmtMoney(n: number, ccy: string) {
  return `${n.toFixed(2)} ${ccy}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function receiptNumber(tx: { id: string; created_at: string }) {
  const d = new Date(tx.created_at);
  const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `MOT-${ym}-${tx.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return jsonError(401, "Unauthorized");

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResp, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResp?.user) return jsonError(401, "Unauthorized");
    const user = userResp.user;

    const body = await req.json().catch(() => null);
    const transactionId = body?.transaction_id;
    if (!transactionId || typeof transactionId !== "string") {
      return jsonError(400, "transaction_id required");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load transaction
    const { data: tx, error: txErr } = await admin
      .from("renter_wallet_transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();
    if (txErr) throw txErr;
    if (!tx) return jsonError(404, "Transaction not found");

    // Authorization: owner or admin
    if (tx.user_id !== user.id) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      if (!isAdmin) return jsonError(403, "Forbidden");
    }

    if (tx.status !== "completed") {
      return jsonError(400, "Receipt is only available for completed transactions");
    }

    // Load profile (billing info)
    const { data: profile } = await admin
      .from("profiles")
      .select("name, email, address, phone")
      .eq("id", tx.user_id)
      .maybeSingle();

    // Optional payment join
    let paymentRef: string | null = null;
    if (tx.related_payment_id) {
      const { data: pay } = await admin
        .from("youcanpay_payments")
        .select("transaction_id, token_id")
        .eq("id", tx.related_payment_id)
        .maybeSingle();
      paymentRef = pay?.transaction_id || pay?.token_id || null;
    }

    // ----- Build PDF -----
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    const lime = rgb(0.624, 0.91, 0.439); // #9FE870
    const forest = rgb(0.086, 0.2, 0); // #163300
    const muted = rgb(0.4, 0.4, 0.4);
    const border = rgb(0.85, 0.85, 0.85);

    // Header band
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: lime });
    page.drawText("MOTONITA", {
      x: 40,
      y: height - 50,
      size: 26,
      font: fontBold,
      color: forest,
    });
    page.drawText("Receipt", {
      x: 40,
      y: height - 70,
      size: 11,
      font,
      color: forest,
    });

    const recNo = receiptNumber({ id: tx.id, created_at: tx.created_at });
    page.drawText(recNo, {
      x: width - 220,
      y: height - 50,
      size: 12,
      font: fontBold,
      color: forest,
    });
    page.drawText(`Issued: ${fmtDate(new Date().toISOString())}`, {
      x: width - 220,
      y: height - 70,
      size: 9,
      font,
      color: forest,
    });

    let y = height - 120;

    // Billed to
    page.drawText("BILLED TO", { x: 40, y, size: 9, font: fontBold, color: muted });
    y -= 16;
    page.drawText(profile?.name || "Renter", { x: 40, y, size: 12, font: fontBold, color: forest });
    y -= 14;
    if (profile?.email) {
      page.drawText(profile.email, { x: 40, y, size: 10, font, color: muted });
      y -= 12;
    }
    if (profile?.phone) {
      page.drawText(profile.phone, { x: 40, y, size: 10, font, color: muted });
      y -= 12;
    }
    if (profile?.address) {
      page.drawText(profile.address, { x: 40, y, size: 10, font, color: muted });
      y -= 12;
    }

    // Transaction details box
    y -= 20;
    const boxTop = y;
    const rows: [string, string][] = [
      ["Transaction date", fmtDate(tx.created_at)],
      ["Type", String(tx.type).toUpperCase()],
      ["Description", tx.description || "—"],
      ["Reference", tx.reference || paymentRef || "—"],
      ["Method", tx.method || "—"],
      ["Status", String(tx.status).toUpperCase()],
    ];

    page.drawRectangle({
      x: 40,
      y: boxTop - rows.length * 22 - 70,
      width: width - 80,
      height: rows.length * 22 + 70,
      borderColor: border,
      borderWidth: 1,
    });

    let ry = boxTop - 18;
    for (const [k, v] of rows) {
      page.drawText(k, { x: 56, y: ry, size: 10, font, color: muted });
      page.drawText(v, { x: 220, y: ry, size: 10, font: fontBold, color: forest });
      ry -= 22;
    }

    // Amount section
    ry -= 8;
    page.drawLine({
      start: { x: 56, y: ry + 10 },
      end: { x: width - 56, y: ry + 10 },
      thickness: 0.5,
      color: border,
    });
    ry -= 14;
    const amount = Number(tx.amount);
    const sign = amount >= 0 ? "+" : "";
    page.drawText("Amount", { x: 56, y: ry, size: 11, font, color: muted });
    page.drawText(`${sign}${fmtMoney(amount, tx.currency)}`, {
      x: width - 200,
      y: ry,
      size: 14,
      font: fontBold,
      color: amount >= 0 ? rgb(0.1, 0.55, 0.2) : forest,
    });
    ry -= 22;
    if (tx.balance_after != null) {
      page.drawText("Balance after", { x: 56, y: ry, size: 11, font, color: muted });
      page.drawText(fmtMoney(Number(tx.balance_after), tx.currency), {
        x: width - 200,
        y: ry,
        size: 12,
        font: fontBold,
        color: forest,
      });
    }

    // Footer
    page.drawText(
      "Motonita SARLAU · Casablanca, Morocco · contact@motonita.ma",
      { x: 40, y: 60, size: 9, font, color: muted },
    );
    page.drawText(
      "This is an electronic receipt for a non-refundable platform service fee.",
      { x: 40, y: 46, size: 9, font, color: muted },
    );
    page.drawText("Thank you for using Motonita.", {
      x: 40,
      y: 32,
      size: 9,
      font: fontBold,
      color: forest,
    });

    const bytes = await pdf.save();

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${recNo}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[generate-receipt] error", e);
    return jsonError(500, e instanceof Error ? e.message : "Internal error");
  }
});
