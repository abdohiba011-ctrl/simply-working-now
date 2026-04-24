// Seed-test-accounts edge function.
// Creates (or normalizes) the 4 QA accounts to the EXACT state needed
// before running the auth test suite. Idempotent — safe to call repeatedly.
//
// SECURITY: Requires `x-seed-secret` header matching SUPABASE_SERVICE_ROLE_KEY,
// or a valid admin JWT. We keep it gated to avoid drive-by abuse.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-seed-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AccountSpec {
  email: string;
  password: string;
  name: string;
  email_confirm: boolean;
  roles: ("renter" | "agency")[];
  agencyVerified?: boolean;
  businessName?: string;
  user_type: "client" | "agency" | "both";
}

const ACCOUNTS: AccountSpec[] = [
  {
    email: "renter@test.com",
    password: "Renter123",
    name: "Test Renter",
    email_confirm: true,
    roles: ["renter"],
    user_type: "client",
  },
  {
    email: "business@test.com",
    password: "Business123",
    name: "Test Business",
    email_confirm: true,
    roles: ["agency"],
    agencyVerified: true,
    businessName: "Test Agency Co.",
    user_type: "agency",
  },
  {
    email: "both@test.com",
    password: "Both123",
    name: "Test Both",
    email_confirm: true,
    roles: ["renter", "agency"],
    agencyVerified: true,
    businessName: "Both Test Agency",
    user_type: "both",
  },
  {
    email: "unverified@test.com",
    password: "Unverified123",
    name: "Test Unverified",
    email_confirm: false,
    roles: ["renter"],
    user_type: "client",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth gate: header secret OR admin role on JWT
  const headerSecret = req.headers.get("x-seed-secret");
  let authorized = headerSecret === SERVICE_ROLE;

  if (!authorized) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      if (data.user) {
        const { data: roleRow } = await userClient
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, unknown>[] = [];

  for (const spec of ACCOUNTS) {
    const result: Record<string, unknown> = { email: spec.email };
    try {
      // 1) Find existing user by email
      let userId: string | null = null;
      const { data: existingList } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const existing = existingList.users.find(
        (u) => u.email?.toLowerCase() === spec.email.toLowerCase(),
      );

      if (existing) {
        userId = existing.id;
        // Update password + email_confirm state to exact spec
        await admin.auth.admin.updateUserById(userId, {
          password: spec.password,
          email_confirm: spec.email_confirm,
          user_metadata: { name: spec.name },
        });
        result.action = "updated";
      } else {
        const { data: created, error: createErr } =
          await admin.auth.admin.createUser({
            email: spec.email,
            password: spec.password,
            email_confirm: spec.email_confirm,
            user_metadata: { name: spec.name },
          });
        if (createErr) throw createErr;
        userId = created.user!.id;
        result.action = "created";
      }

      // 2) Upsert profile
      const profilePatch: Record<string, unknown> = {
        id: userId,
        email: spec.email,
        name: spec.name,
        user_type: spec.user_type,
      };
      if (spec.roles.includes("agency")) {
        profilePatch.business_name = spec.businessName ?? `${spec.name} Agency`;
        profilePatch.business_type = "small";
        profilePatch.business_address = "Casablanca";
        profilePatch.is_verified = !!spec.agencyVerified;
        profilePatch.verification_status = spec.agencyVerified
          ? "verified"
          : "not_started";
      } else {
        profilePatch.is_verified = false;
        profilePatch.verification_status = "not_started";
        profilePatch.business_name = null;
      }

      const { error: profileErr } = await admin
        .from("profiles")
        .upsert(profilePatch, { onConflict: "id" });
      if (profileErr) throw profileErr;

      // 3) Reset roles for this user, then insert exact spec
      await admin.from("user_roles").delete().eq("user_id", userId);
      const roleRows = spec.roles.map((r) => ({
        user_id: userId,
        // user_roles.role is enum app_role: 'admin' | 'business' | 'renter'/etc.
        // We map "agency" => "business" (matches existing app convention)
        role: r === "agency" ? "business" : r,
      }));
      if (roleRows.length > 0) {
        const { error: rolesErr } = await admin
          .from("user_roles")
          .insert(roleRows);
        if (rolesErr) throw rolesErr;
      }

      result.user_id = userId;
      result.email_confirmed = spec.email_confirm;
      result.roles = spec.roles;
      result.agency_verified = !!spec.agencyVerified;
      result.status = "ok";
    } catch (e) {
      result.status = "error";
      result.error = (e as Error).message;
    }
    results.push(result);
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
