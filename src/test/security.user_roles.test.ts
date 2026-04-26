import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Security regression tests for the `user_roles` table.
 *
 * Goals:
 *  - Anonymous users MUST NOT be able to insert into `user_roles`
 *    (privilege escalation).
 *  - Anonymous users MUST NOT be able to read `user_roles` rows.
 *  - The restrictive RLS policy + SECURITY DEFINER trigger together
 *    ensure non-service writes are denied.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

const skip = !SUPABASE_URL || !SUPABASE_ANON_KEY;

const anon = skip
  ? null
  : createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

describe("RLS: user_roles table", () => {
  it.skipIf(skip)("anon cannot insert any role into user_roles", async () => {
    const fakeUserId = "00000000-0000-0000-0000-000000000001";

    const { data, error } = await anon!
      .from("user_roles" as any)
      .insert({ user_id: fakeUserId, role: "admin" })
      .select();

    // Must fail. No row should ever come back.
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it.skipIf(skip)(
    "anon cannot insert a non-admin role into user_roles either",
    async () => {
      const fakeUserId = "00000000-0000-0000-0000-000000000002";

      const { data, error } = await anon!
        .from("user_roles" as any)
        .insert({ user_id: fakeUserId, role: "user" })
        .select();

      expect(error).not.toBeNull();
      expect(data ?? []).toHaveLength(0);
    },
  );

  it.skipIf(skip)(
    "anon cannot read rows from user_roles",
    async () => {
      const { data, error } = await anon!
        .from("user_roles" as any)
        .select("user_id, role")
        .limit(1);

      // Either explicit error or empty result set — never leaks rows.
      if (!error) {
        expect(data ?? []).toHaveLength(0);
      }
    },
  );
});
