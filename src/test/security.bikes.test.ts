import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Security regression tests for the `bikes` table.
 *
 * Goals:
 *  - Anonymous users MUST NOT be able to read sensitive columns
 *    (`license_plate`, `notes`) from the `bikes` table.
 *  - Anonymous users MAY only read available bikes through the
 *    `bikes_public` view, and that view MUST NOT expose those columns.
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

describe("RLS: bikes table", () => {
  it.skipIf(skip)(
    "anon cannot select license_plate or notes directly from bikes",
    async () => {
      const { data, error } = await anon!
        .from("bikes" as any)
        .select("license_plate, notes")
        .limit(1);

      // Either the request errors (column-level grant denied) or the data is
      // empty / null — never returns a populated license_plate value.
      if (error) {
        expect(error.message.toLowerCase()).toMatch(
          /permission|denied|not allowed|grant/i,
        );
      } else {
        for (const row of data ?? []) {
          expect((row as any).license_plate).toBeFalsy();
          expect((row as any).notes).toBeFalsy();
        }
      }
    },
  );

  it.skipIf(skip)(
    "anon can read safe columns from bikes_public view",
    async () => {
      const { data, error } = await anon!
        .from("bikes_public" as any)
        .select("id, bike_type_id, location, available")
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    },
  );

  it.skipIf(skip)(
    "bikes_public view does not expose license_plate or notes",
    async () => {
      const { data, error } = await anon!
        .from("bikes_public" as any)
        .select("license_plate, notes")
        .limit(1);

      // The view doesn't include these columns at all — request should fail
      // or return rows where the values are undefined/null.
      if (!error) {
        for (const row of data ?? []) {
          expect((row as any).license_plate).toBeUndefined();
          expect((row as any).notes).toBeUndefined();
        }
      } else {
        expect(error.message).toBeTruthy();
      }
    },
  );
});
