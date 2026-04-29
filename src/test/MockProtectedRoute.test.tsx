import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { MockProtectedRoute } from "@/components/auth/MockProtectedRoute";
import { useAuthStore } from "@/stores/useAuthStore";

// Hoist-safe Supabase mock so initAuthListener / checkAuth resolve cleanly.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn(),
  },
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/agency/motorbikes/new"
          element={
            <MockProtectedRoute role="agency">
              <div data-testid="motorbike-new-page">Add motorbike form</div>
            </MockProtectedRoute>
          }
        />
        <Route path="/agency/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route path="/login" element={<div data-testid="login">Login</div>} />
        <Route path="/rent" element={<div data-testid="rent">Rent</div>} />
        <Route path="/verify-email" element={<div data-testid="verify">Verify</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MockProtectedRoute — hard-reload behavior", () => {
  beforeEach(() => {
    // Reset store to its initial state (matches the new isLoading: true default).
    useAuthStore.setState({
      user: null,
      currentRole: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      authListenerInitialized: false,
      error: null,
      needsVerification: false,
      pendingEmail: null,
    });
  });

  it("renders the loading spinner during the initial hydration window (no premature redirect)", () => {
    renderAt("/agency/motorbikes/new");
    // Crucially: NOT redirected to dashboard / login while auth is hydrating.
    expect(screen.queryByTestId("dashboard")).toBeNull();
    expect(screen.queryByTestId("login")).toBeNull();
    expect(screen.queryByTestId("motorbike-new-page")).toBeNull();
  });

  it("lands on /agency/motorbikes/new after a hard reload when the user is a verified agency", async () => {
    // Simulate the auth store finishing hydration with an agency user.
    useAuthStore.setState({
      isLoading: false,
      authListenerInitialized: true,
      isAuthenticated: true,
      currentRole: "agency",
      user: {
        id: "u1",
        email: "agency@example.com",
        phone: null,
        password_hash: "",
        created_at: new Date().toISOString(),
        email_verified: true,
        phone_verified: false,
        name: "Agency",
        roles: {
          renter: { active: false, profile: { displayName: "Agency" } },
          agency: { active: true, verified: true, profile: { agencyName: "Agency" } },
        },
        default_role: "agency",
        last_active_role: "agency",
        failed_login_attempts: 0,
        locked_until: null,
        suspended: false,
        isAdmin: false,
      } as any,
    });

    renderAt("/agency/motorbikes/new");

    await waitFor(() => {
      expect(screen.getByTestId("motorbike-new-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });

  it("redirects to /login only AFTER auth resolves with no session", async () => {
    useAuthStore.setState({
      isLoading: false,
      authListenerInitialized: true,
      isAuthenticated: false,
      user: null,
    });

    renderAt("/agency/motorbikes/new");

    await waitFor(() => {
      expect(screen.getByTestId("login")).toBeInTheDocument();
    });
  });
});
