import { create } from "zustand";
import {
  mockLogin,
  mockSignup,
  mockVerifyEmailCode,
  mockResendVerification,
  type AppRole,
  type AuthError,
  type MockUser,
  type SignupFormData,
} from "@/lib/mockAuth";

const SESSION_KEY = "motonita_auth_session";
const PERSIST_FLAG_KEY = "motonita_auth_persistent";

interface PersistedSession {
  user: MockUser;
  currentRole: AppRole;
  rememberMe: boolean;
  savedAt: number;
}

function readSession(): PersistedSession | null {
  try {
    const persistent = localStorage.getItem(PERSIST_FLAG_KEY) === "true";
    const raw = persistent
      ? localStorage.getItem(SESSION_KEY)
      : sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

function writeSession(session: PersistedSession): void {
  try {
    const payload = JSON.stringify(session);
    if (session.rememberMe) {
      localStorage.setItem(PERSIST_FLAG_KEY, "true");
      localStorage.setItem(SESSION_KEY, payload);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.removeItem(PERSIST_FLAG_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.setItem(SESSION_KEY, payload);
    }
  } catch {
    // ignore storage failures
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(PERSIST_FLAG_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

interface AuthState {
  user: MockUser | null;
  currentRole: AppRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | string | null;
  needsVerification: boolean;
  pendingEmail: string | null; // email awaiting code verification

  login: (
    emailOrPhone: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<MockUser>;
  signup: (formData: SignupFormData, role: AppRole) => Promise<MockUser>;
  verifyEmail: (code: string, emailOverride?: string) => Promise<MockUser>;
  resendVerificationCode: (emailOverride?: string) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: AppRole) => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setPendingEmail: (email: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentRole: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  needsVerification: false,
  pendingEmail: null,

  login: async (emailOrPhone, password, rememberMe = false) => {
    set({ isLoading: true, error: null, needsVerification: false });
    try {
      const user = await mockLogin(emailOrPhone, password);

      // Determine the initial active role on login.
      // Priority: agency (if active) > renter > default_role
      let currentRole: AppRole = user.default_role;
      if (user.roles.agency.active && user.roles.renter.active) {
        currentRole = user.last_active_role;
      } else if (user.roles.agency.active) {
        currentRole = "agency";
      } else if (user.roles.renter.active) {
        currentRole = "renter";
      }

      const session: PersistedSession = {
        user,
        currentRole,
        rememberMe,
        savedAt: Date.now(),
      };
      writeSession(session);

      set({
        user,
        currentRole,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        needsVerification: false,
      });
      return user;
    } catch (err) {
      const authErr = err as AuthError;
      set({
        isLoading: false,
        error: authErr.message || "Login failed",
        needsVerification: authErr.code === "EMAIL_NOT_VERIFIED",
      });
      throw err;
    }
  },

  logout: () => {
    clearSession();
    set({
      user: null,
      currentRole: null,
      isAuthenticated: false,
      error: null,
      needsVerification: false,
    });
  },

  switchRole: (newRole) => {
    const { user } = get();
    if (!user) return;
    if (!user.roles[newRole]?.active) return;

    const updated: MockUser = { ...user, last_active_role: newRole };
    const persistent = localStorage.getItem(PERSIST_FLAG_KEY) === "true";
    writeSession({
      user: updated,
      currentRole: newRole,
      rememberMe: persistent,
      savedAt: Date.now(),
    });
    set({ user: updated, currentRole: newRole });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const session = readSession();
    if (session?.user) {
      set({
        user: session.user,
        currentRole: session.currentRole,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null, needsVerification: false }),
}));
