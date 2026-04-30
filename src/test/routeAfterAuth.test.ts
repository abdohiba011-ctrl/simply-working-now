import { describe, it, expect, vi } from "vitest";
import { getDestinationForUser, navigateAfterAuth } from "@/lib/routeAfterAuth";
import type { MockUser } from "@/lib/mockAuth";

// Avoid loading the real Supabase client (which reads env in node test env).
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

function makeUser(opts: {
  agency?: boolean;
  agencyVerified?: boolean;
  renter?: boolean;
  emailVerified?: boolean;
  isAdmin?: boolean;
}): MockUser {
  return {
    id: "u1",
    email: "u@example.com",
    phone: null,
    password_hash: "",
    created_at: new Date().toISOString(),
    email_verified: opts.emailVerified ?? true,
    phone_verified: false,
    name: "Test",
    roles: {
      renter: { active: !!opts.renter, profile: null },
      agency: {
        active: !!opts.agency,
        verified: !!opts.agencyVerified,
        profile: null,
      },
    },
    default_role: opts.agency ? "agency" : "renter",
    last_active_role: opts.agency ? "agency" : "renter",
    failed_login_attempts: 0,
    locked_until: null,
    isAdmin: !!opts.isAdmin,
  };
}

describe("getDestinationForUser — admin", () => {
  it("admin role → /admin/panel regardless of other roles or context", () => {
    const u = makeUser({ isAdmin: true, renter: true });
    expect(getDestinationForUser(u)).toBe("/admin/panel");
    expect(getDestinationForUser(u, "renter")).toBe("/admin/panel");
    expect(getDestinationForUser(u, "agency")).toBe("/admin/panel");
    expect(getDestinationForUser(u, "admin")).toBe("/admin/panel");
  });

  it("admin + agency still goes to /admin/panel", () => {
    const u = makeUser({ isAdmin: true, agency: true, agencyVerified: true });
    expect(getDestinationForUser(u)).toBe("/admin/panel");
  });

  it("admin with unverified email still gets /verify-email first", () => {
    const u = makeUser({ isAdmin: true, emailVerified: false });
    expect(getDestinationForUser(u)).toBe("/verify-email");
  });
});

describe("getDestinationForUser — agency isolation", () => {
  it("verified agency → /agency/dashboard regardless of context", () => {
    const u = makeUser({ agency: true, agencyVerified: true });
    expect(getDestinationForUser(u)).toBe("/agency/dashboard");
    expect(getDestinationForUser(u, "renter")).toBe("/agency/dashboard");
    expect(getDestinationForUser(u, "agency")).toBe("/agency/dashboard");
  });

  it("unverified agency → /agency/verification, never /rent", () => {
    const u = makeUser({ agency: true, agencyVerified: false });
    expect(getDestinationForUser(u)).toBe("/agency/verification");
    expect(getDestinationForUser(u, "renter")).toBe("/agency/verification");
  });

  it("agency user with stray renter flag is still agency-only", () => {
    const u = makeUser({ agency: true, agencyVerified: true, renter: true });
    expect(getDestinationForUser(u, "renter")).toBe("/agency/dashboard");
    expect(getDestinationForUser(u)).not.toMatch(/^\/rent/);
  });

  it("renter-only account → /rent", () => {
    const u = makeUser({ renter: true });
    expect(getDestinationForUser(u)).toBe("/rent");
  });

  it("unverified email → /verify-email", () => {
    const u = makeUser({ agency: true, emailVerified: false });
    expect(getDestinationForUser(u)).toBe("/verify-email");
  });
});

describe("navigateAfterAuth — agency users never see /rent", () => {
  it("calls navigate with the agency dashboard for agency users", () => {
    const navigate = vi.fn();
    const u = makeUser({ agency: true, agencyVerified: true });
    navigateAfterAuth(navigate as never, u, "renter");
    expect(navigate).toHaveBeenCalledWith("/agency/dashboard", { replace: true });
    const [path] = navigate.mock.calls[0];
    expect(path).not.toMatch(/^\/rent/);
  });

  it("renter-only users go to /rent", () => {
    const navigate = vi.fn();
    const u = makeUser({ renter: true });
    navigateAfterAuth(navigate as never, u, "renter");
    expect(navigate).toHaveBeenCalledWith("/rent", { replace: true });
  });
});
