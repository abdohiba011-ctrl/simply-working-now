import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import { useAuthStore } from "@/stores/useAuthStore";
import type { MockUser } from "@/lib/mockAuth";

function agencyUser(): MockUser {
  return {
    id: "u1",
    email: "a@x.com",
    phone: null,
    password_hash: "",
    created_at: new Date().toISOString(),
    email_verified: true,
    phone_verified: false,
    name: "Agency",
    roles: {
      renter: { active: false, profile: null },
      agency: { active: true, verified: true, profile: null },
    },
    default_role: "agency",
    last_active_role: "agency",
    failed_login_attempts: 0,
    locked_until: null,
  };
}

describe("useAuthStore role isolation guards", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: agencyUser(),
      currentRole: "agency",
      isAuthenticated: true,
    });
  });

  it("switchRole('renter') is allowed for agency users (renter is a public view, not a privileged role)", () => {
    useAuthStore.getState().switchRole("renter");
    const { currentRole, user } = useAuthStore.getState();
    expect(currentRole).toBe("renter");
    expect(user?.last_active_role).toBe("renter");
    // Agency permission is preserved
    expect(user?.roles.agency.active).toBe(true);
  });

  it("activateRenterRole() succeeds for agency users without removing agency permission", async () => {
    const next = await useAuthStore.getState().activateRenterRole();
    expect(next.roles.agency.active).toBe(true);
    expect(useAuthStore.getState().currentRole).toBe("renter");
  });
});
