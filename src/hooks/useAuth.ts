// Shim adapter: routes all useAuth() calls to useAuthStore.
// Single source of truth: useAuthStore (Zustand).
// Migration path: components may gradually be refactored to call
// useAuthStore directly, but this is not required.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore, writeCachedIsAdmin } from "@/stores/useAuthStore";
import type { AppRole, MockUser, SignupFormData } from "@/lib/mockAuth";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Returns the same shape the old AuthContext exposed, backed entirely by
 * useAuthStore. Components that read `user.id`, `user.email`,
 * `user.created_at` keep working because MockUser exposes those fields.
 */
export function useAuth() {
  const storeUser = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const authListenerInitialized = useAuthStore(
    (s) => s.authListenerInitialized,
  );
  const storeLogin = useAuthStore((s) => s.login);
  const storeSignup = useAuthStore((s) => s.signup);
  const storeLogout = useAuthStore((s) => s.logout);

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isRefreshingRoles, setIsRefreshingRoles] = useState(false);

  // Make sure the broker/listener is wired up the first time anyone reads
  // auth — otherwise hard-reload pages that only consume useAuth() (and
  // never touch a guard that calls checkAuth) would never resolve.
  useEffect(() => {
    if (!authListenerInitialized) void checkAuth();
  }, [authListenerInitialized, checkAuth]);

  // Derive the legacy `userRoles: string[]` shape from the MockUser model.
  useEffect(() => {
    if (!storeUser) {
      setUserRoles([]);
      return;
    }
    const roles: string[] = [];
    if (storeUser.roles.renter?.active) roles.push("renter");
    if (storeUser.roles.agency?.active) roles.push("agency");
    if (storeUser.isAdmin) roles.push("admin");
    setUserRoles(roles);
  }, [storeUser]);

  const fetchRolesFromDb = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      console.error("[useAuth] fetchRolesFromDb error", error);
      return [] as string[];
    }
    return (data ?? []).map((r) => r.role as string);
  }, []);

  const refreshRoles = useCallback(async (): Promise<string[]> => {
    if (!storeUser) {
      setUserRoles([]);
      return [];
    }
    setIsRefreshingRoles(true);
    try {
      const dbRoles = await fetchRolesFromDb(storeUser.id);
      writeCachedIsAdmin(storeUser.id, dbRoles.includes("admin"));
      // Re-sync the store so derived role flags also update.
      try {
        await useAuthStore.getState().checkAuth();
      } catch (e) {
        console.warn("[useAuth] checkAuth during refreshRoles failed", e);
      }
      // Compose the array in the same form callers expect (renter/agency/admin).
      const composed = new Set<string>(dbRoles);
      const fresh = useAuthStore.getState().user;
      if (fresh?.roles.renter?.active) composed.add("renter");
      if (fresh?.roles.agency?.active) composed.add("agency");
      if (fresh?.isAdmin) composed.add("admin");
      const arr = Array.from(composed);
      setUserRoles(arr);
      return arr;
    } finally {
      setIsRefreshingRoles(false);
    }
  }, [fetchRolesFromDb, storeUser]);

  const hasRole = useCallback(
    (role: string): boolean => {
      // Treat the legacy "business" alias as "agency".
      if (role === "business") return userRoles.includes("agency");
      return userRoles.includes(role);
    },
    [userRoles],
  );

  // Adapters to match the OLD signatures used across the codebase.
  const login = useCallback(
    async (
      emailOrPhone: string,
      password: string,
      rememberMe: boolean = true,
    ) => {
      await storeLogin(emailOrPhone, password, rememberMe);
    },
    [storeLogin],
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role: "user" | "business" | AppRole,
    ) => {
      const mappedRole: AppRole =
        role === "business" || role === "agency" ? "agency" : "renter";
      const formData: SignupFormData = { email, password, name };
      await storeSignup(formData, mappedRole);
    },
    [storeSignup],
  );

  const logout = useCallback(async () => {
    await storeLogout();
  }, [storeLogout]);

  // Expose `user` as the Supabase User shape when possible (session.user),
  // falling back to the MockUser. Both have `.id` / `.email`, so callers
  // that read those fields work regardless. We also surface MockUser-only
  // fields so existing code paths keep working.
  const user = useMemo<(User & Partial<MockUser>) | MockUser | null>(() => {
    if (!storeUser) return null;
    if (session?.user) {
      return Object.assign({}, session.user, storeUser) as User & MockUser;
    }
    return storeUser;
  }, [session, storeUser]);

  return {
    user,
    session: session as Session | null,
    isAuthenticated,
    isLoading,
    userRoles,
    hasRole,
    refreshRoles,
    isRefreshingRoles,
    login,
    signup,
    logout,
    // Modern aliases — some callers may use these.
    signIn: login,
    signUp: signup,
    signOut: logout,
  };
}

export default useAuth;
