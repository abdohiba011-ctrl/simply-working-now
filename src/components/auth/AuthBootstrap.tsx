import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Runs once at app boot:
 *  - sets up the Supabase auth listener
 *  - rehydrates the session
 *  - enforces strict "Remember Me": if the user did NOT tick Remember Me on
 *    their last login, and the browser was fully closed (sessionStorage
 *    cleared), `checkAuth` signs them out.
 */
export function AuthBootstrap() {
  useEffect(() => {
    void useAuthStore.getState().checkAuth();
  }, []);
  return null;
}
