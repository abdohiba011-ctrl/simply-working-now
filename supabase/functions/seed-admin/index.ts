// Seed-admin: bootstrap or recover an admin account.
// Public endpoint with shared-secret check. Use to recreate the platform admin
// after a wipe or to grant admin to an existing user.
//
// Body: { email: string, password?: string, secret: string, full_name?: string }
//
// Behavior:
//   - If the email exists in auth.users: just grant admin role + admin_employees row.
//   - Otherwise: create the user (auto-confirmed) with the supplied password,
//     then grant admin role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SEED_SECRET =
  Deno.env.get("SEED_ADMIN_SECRET") ??
  Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? // fallback so it works on day one
  "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, secret, full_name } = body ?? {};

    if (!secret || secret !== SEED_SECRET) {
      return json({ error: "FORBIDDEN" }, 403);
    }
    if (!email || typeof email !== "string") {
      return json({ error: "email is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Find existing user
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;

    let user = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    // 2. Create if missing
    if (!user) {
      if (!password || password.length < 8) {
        return json(
          { error: "password (>=8 chars) required to create new admin" },
          400,
        );
      }
      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name ?? "Platform Admin",
            signup_role: "renter",
          },
        });
      if (createErr) throw createErr;
      user = created.user!;
    }

    const userId = user.id;

    // 3. Grant admin role (idempotent)
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin", is_active: true },
        { onConflict: "user_id,role" },
      );
    if (roleErr) throw roleErr;

    // 4. Ensure admin_employees row (super admin)
    const { error: empErr } = await supabase
      .from("admin_employees")
      .upsert(
        {
          user_id: userId,
          is_super_admin: true,
          role: "admin",
          permissions: { all: true },
        },
        { onConflict: "user_id" },
      );
    if (empErr) throw empErr;

    return json({
      ok: true,
      user_id: userId,
      email: user.email,
      message: "Admin seeded. You can now sign in with this account.",
    });
  } catch (e) {
    console.error("seed-admin error", e);
    return json({ error: (e as Error).message ?? String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
