import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import {
  COMMON_PASSWORDS,
  checkResetRequestAllowed,
  clearLockout,
  consumeResetToken,
  detectIdentifierType,
  getLockoutRemainingMs,
  issueResetToken,
  makeAuthError,
  normalizePhone,
  recordLockout,
  recordResetResend,
  recordVerificationResend,
  type AgencyExtraData,
  type AppRole,
  type AuthError,
  type MockUser,
  type SignupFormData,
} from "@/lib/mockAuth";

// ---------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------

const LAST_ROLE_KEY = "motonita_last_active_role";
const REMEMBER_ME_KEY = "motonita_auth_remember"; // localStorage flag — survives browser close
const SESSION_ALIVE_KEY = "motonita_auth_session_alive"; // sessionStorage flag — cleared on browser close
const FAILED_ATTEMPTS_PREFIX = "motonita_failed_attempts:"; // per-identifier failure counter

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function readLastRole(): AppRole | null {
  try {
    const v = localStorage.getItem(LAST_ROLE_KEY);
    return v === "renter" || v === "agency" ? v : null;
  } catch {
    return null;
  }
}

function writeLastRole(role: AppRole): void {
  try {
    localStorage.setItem(LAST_ROLE_KEY, role);
  } catch {
    // ignore
  }
}

function clearLastRole(): void {
  try {
    localStorage.removeItem(LAST_ROLE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(SESSION_ALIVE_KEY);
  } catch {
    // ignore
  }
}

function markRememberMe(remember: boolean): void {
  try {
    if (remember) {
      localStorage.setItem(REMEMBER_ME_KEY, "1");
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
    // Always mark this tab/window as "alive" so a refresh keeps the user logged in,
    // but a full browser close will clear sessionStorage and we'll sign out on next boot.
    sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
  } catch {
    // ignore
  }
}

function isRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) === "1";
  } catch {
    return false;
  }
}

function isSessionAliveFlagSet(): boolean {
  try {
    return sessionStorage.getItem(SESSION_ALIVE_KEY) === "1";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// Failed-attempt tracking (client-side; Supabase enforces server limits too)
// ---------------------------------------------------------------------

function getFailedAttempts(identifier: string): number {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_PREFIX + identifier.toLowerCase().trim());
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function bumpFailedAttempts(identifier: string): number {
  const next = getFailedAttempts(identifier) + 1;
  try {
    localStorage.setItem(FAILED_ATTEMPTS_PREFIX + identifier.toLowerCase().trim(), String(next));
  } catch {
    // ignore
  }
  return next;
}

function clearFailedAttempts(identifier: string): void {
  try {
    localStorage.removeItem(FAILED_ATTEMPTS_PREFIX + identifier.toLowerCase().trim());
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------
// Mapping Supabase user + DB rows → MockUser
// ---------------------------------------------------------------------

interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  is_verified: boolean | null;
  user_type: string | null;
  business_name: string | null;
  business_type: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  verification_status: string | null;
  is_frozen: boolean | null;
  created_at: string;
}

async function loadAuthUserModel(authUser: User): Promise<MockUser> {
  // Fetch profile + roles in parallel.
  const [profileRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,name,phone,phone_verified,is_verified,user_type,business_name,business_type,business_address,business_phone,business_email,verification_status,is_frozen,created_at",
      )
      .eq("id", authUser.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", authUser.id),
  ]);

  const profile = (profileRes.data as ProfileRow | null) ?? null;
  const roles = (rolesRes.data ?? []).map((r) => r.role as string);

  // Every signed-up user can browse / book bikes by default.
  const renterActive = true;

  // Agency role: explicit DB role OR a populated business profile.
  const hasBusinessRow = !!(profile?.business_name && profile.business_name.trim().length > 0);
  const agencyActive = roles.includes("business") || hasBusinessRow;
  const agencyVerified =
    !!profile?.is_verified && profile?.verification_status === "verified";

  // Decide initial last_active_role:
  //  1) Persisted choice from a previous session (if user still has the role)
  //  2) Otherwise: agency-priority for agency-active users, else renter
  const persisted = readLastRole();
  let lastActive: AppRole;
  if (persisted === "agency" && agencyActive) lastActive = "agency";
  else if (persisted === "renter" && renterActive) lastActive = "renter";
  else if (agencyActive) lastActive = "agency";
  else lastActive = "renter";

  const displayName =
    profile?.name?.trim() ||
    (authUser.user_metadata?.name as string | undefined) ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    authUser.email?.split("@")[0] ||
    "User";

  return {
    id: authUser.id,
    email: authUser.email ?? profile?.email ?? "",
    phone: profile?.phone ?? authUser.phone ?? null,
    password_hash: "", // not used
    created_at: authUser.created_at ?? profile?.created_at ?? new Date().toISOString(),
    email_verified: !!authUser.email_confirmed_at,
    phone_verified: !!profile?.phone_verified,
    name: displayName,
    roles: {
      renter: {
        active: renterActive,
        profile: { displayName },
      },
      agency: {
        active: agencyActive,
        verified: agencyVerified,
        profile: hasBusinessRow
          ? {
              agencyName: profile?.business_name,
              businessType: profile?.business_type,
              businessAddress: profile?.business_address,
              businessPhone: profile?.business_phone,
              businessEmail: profile?.business_email,
            }
          : null,
      },
    },
    default_role: agencyActive ? "agency" : "renter",
    last_active_role: lastActive,
    failed_login_attempts: 0,
    locked_until: null,
    suspended: !!profile?.is_frozen,
  };
}

// ---------------------------------------------------------------------
// Translate Supabase auth errors → our AuthError shape
// ---------------------------------------------------------------------

function mapSupabaseAuthError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return makeAuthError("INVALID_CREDENTIALS", "Incorrect email or password. Please try again.");
  }
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
    return makeAuthError("EMAIL_NOT_VERIFIED", "Please verify your email first.", {
      needsVerification: true,
    });
  }
  if (m.includes("user already registered") || m.includes("already registered")) {
    return makeAuthError(
      "EMAIL_TAKEN",
      "This email is already registered. Try logging in instead.",
    );
  }
  if (m.includes("password should be") || m.includes("weak password") || m.includes("pwned")) {
    return makeAuthError("WEAK_PASSWORD", message);
  }
  if (m.includes("rate") || m.includes("too many")) {
    return makeAuthError("RATE_LIMITED", message);
  }
  if (m.includes("token") && m.includes("expired")) {
    return makeAuthError("TOKEN_EXPIRED", "This link expired. Please request a new one.");
  }
  if (m.includes("invalid token") || m.includes("invalid otp") || m.includes("token has expired")) {
    return makeAuthError("INVALID_TOKEN", message);
  }
  if (m.includes("otp") || m.includes("code")) {
    return makeAuthError("INVALID_CODE", message);
  }
  return makeAuthError("NETWORK", message || "Something went wrong");
}

// ---------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------

interface AuthState {
  user: MockUser | null;
  currentRole: AppRole | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | string | null;
  needsVerification: boolean;
  pendingEmail: string | null;
  authListenerInitialized: boolean;

  login: (
    emailOrPhone: string,
    password: string,
    rememberMe?: boolean,
    context?: AppRole,
  ) => Promise<MockUser>;
  signup: (formData: SignupFormData, role: AppRole) => Promise<MockUser>;
  verifyEmail: (code: string, emailOverride?: string) => Promise<MockUser>;
  resendVerificationCode: (emailOverride?: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyResetCode: (email: string, code: string) => Promise<string>;
  setNewPassword: (resetToken: string, newPassword: string) => Promise<MockUser>;
  logout: () => Promise<void>;
  switchRole: (newRole: AppRole) => void;
  activateRenterRole: () => Promise<MockUser>;
  activateAgencyRole: (data: AgencyExtraData) => Promise<MockUser>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setPendingEmail: (email: string | null) => void;
  initAuthListener: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentRole: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  needsVerification: false,
  pendingEmail: null,
  authListenerInitialized: false,

  // -----------------------------------------------------------------
  // Auth listener — must be set up before getSession() per docs
  // -----------------------------------------------------------------
  initAuthListener: () => {
    if (get().authListenerInitialized) return;
    set({ authListenerInitialized: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      // Defer DB calls to avoid deadlocks inside the auth listener
      if (session?.user) {
        setTimeout(async () => {
          try {
            const mapped = await loadAuthUserModel(session.user);
            set({
              user: mapped,
              session,
              currentRole: mapped.last_active_role,
              isAuthenticated: true,
            });
          } catch (e) {
            console.error("[useAuthStore] Failed to map auth user", e);
          }
        }, 0);
      } else {
        set({
          user: null,
          session: null,
          currentRole: null,
          isAuthenticated: false,
        });
      }
    });
  },

  // -----------------------------------------------------------------
  // LOGIN
  // -----------------------------------------------------------------
  login: async (emailOrPhone, password, rememberMe = false, context) => {
    set({ isLoading: true, error: null, needsVerification: false });

    // Surface client-side lockout (best-effort UX guard)
    const lockMs = getLockoutRemainingMs(emailOrPhone);
    if (lockMs > 0) {
      const err = makeAuthError(
        "ACCOUNT_LOCKED",
        "Too many failed attempts. Please try again in a few minutes.",
        { retryAfterMs: lockMs },
      );
      set({ isLoading: false, error: err.message });
      throw err;
    }

    const id = emailOrPhone.trim();
    const idType = detectIdentifierType(id);
    if (idType === "unknown") {
      const err = makeAuthError(
        "INVALID_CREDENTIALS",
        "Enter a valid email or Moroccan phone number.",
      );
      set({ isLoading: false, error: err.message });
      throw err;
    }

    let signInResult;
    if (idType === "email") {
      signInResult = await supabase.auth.signInWithPassword({
        email: id.toLowerCase(),
        password,
      });
    } else {
      const phone = normalizePhone(id);
      if (!phone) {
        const err = makeAuthError("INVALID_CREDENTIALS", "Invalid phone number.");
        set({ isLoading: false, error: err.message });
        throw err;
      }
      signInResult = await supabase.auth.signInWithPassword({ phone, password });
    }

    if (signInResult.error || !signInResult.data.user) {
      const err = mapSupabaseAuthError(signInResult.error?.message ?? "Login failed");

      // Track client-side lockout: 5 wrong creds → 15 min cooldown.
      if (err.code === "INVALID_CREDENTIALS") {
        const attempts = bumpFailedAttempts(emailOrPhone);
        const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          recordLockout(emailOrPhone, LOCKOUT_DURATION_MS);
          clearFailedAttempts(emailOrPhone);
          const lockedErr = makeAuthError(
            "ACCOUNT_LOCKED",
            "Too many failed attempts. Please try again in 15 minutes.",
            { retryAfterMs: LOCKOUT_DURATION_MS },
          );
          set({ isLoading: false, error: lockedErr.message });
          throw lockedErr;
        }
        // Annotate the error with attempts left so the UI can show it.
        err.attemptsLeft = remaining;
        if (remaining <= 2) {
          err.message = `Incorrect email or password. ${remaining} ${
            remaining === 1 ? "attempt" : "attempts"
          } left before lockout.`;
        }
      }

      set({
        isLoading: false,
        error: err.message,
        needsVerification: err.code === "EMAIL_NOT_VERIFIED",
        pendingEmail: err.code === "EMAIL_NOT_VERIFIED" ? id.toLowerCase() : get().pendingEmail,
      });
      throw err;
    }

    clearLockout(emailOrPhone);
    clearFailedAttempts(emailOrPhone);

    const mapped = await loadAuthUserModel(signInResult.data.user);

    // Determine active role from login context + available roles
    let currentRole: AppRole;
    if (context === "agency" && mapped.roles.agency.active) {
      currentRole = "agency";
    } else if (context === "renter" && mapped.roles.renter.active) {
      currentRole = "renter";
    } else if (mapped.roles.agency.active && mapped.roles.renter.active) {
      currentRole = mapped.last_active_role;
    } else if (mapped.roles.agency.active) {
      currentRole = "agency";
    } else {
      currentRole = "renter";
    }

    const user: MockUser = { ...mapped, last_active_role: currentRole };
    writeLastRole(currentRole);
    markRememberMe(rememberMe);

    set({
      user,
      session: signInResult.data.session,
      currentRole,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      needsVerification: false,
      pendingEmail: null,
    });
    return user;
  },

  // -----------------------------------------------------------------
  // LOGOUT
  // -----------------------------------------------------------------
  logout: async () => {
    await supabase.auth.signOut();
    clearLastRole();
    set({
      user: null,
      session: null,
      currentRole: null,
      isAuthenticated: false,
      error: null,
      needsVerification: false,
    });
  },

  // -----------------------------------------------------------------
  // ROLE SWITCHING / ACTIVATION
  // -----------------------------------------------------------------
  switchRole: (newRole) => {
    const { user } = get();
    if (!user) return;
    if (!user.roles[newRole]?.active) return;

    const updated: MockUser = { ...user, last_active_role: newRole };
    writeLastRole(newRole);
    set({ user: updated, currentRole: newRole });
  },

  activateRenterRole: async () => {
    const { user } = get();
    if (!user) throw new Error("Not authenticated");
    // Renter role is always implicitly active in our mapping; no DB write
    // is required. Just flip the active role and persist it.
    const updated: MockUser = {
      ...user,
      roles: { ...user.roles, renter: { ...user.roles.renter, active: true } },
      last_active_role: "renter",
    };
    writeLastRole("renter");
    set({ user: updated, currentRole: "renter" });
    return updated;
  },

  activateAgencyRole: async (data) => {
    const { user } = get();
    if (!user) throw new Error("Not authenticated");
    set({ isLoading: true, error: null });

    try {
      // 1. Upsert business profile fields
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          user_type: "business",
          business_name: data.businessName,
          business_type: data.businessType,
          business_address: data.city,
          ...(data.phone ? { business_phone: normalizePhone(data.phone) ?? data.phone } : {}),
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      // 2. Reload from DB so verified flags etc. reflect reality
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Session lost");
      const reloaded = await loadAuthUserModel(authData.user);
      const next: MockUser = { ...reloaded, last_active_role: "agency" };
      writeLastRole("agency");
      set({ user: next, currentRole: "agency", isLoading: false });
      return next;
    } catch (err) {
      const e = err as Error;
      const mapped = mapSupabaseAuthError(e.message);
      set({ isLoading: false, error: mapped.message });
      throw mapped;
    }
  },

  // -----------------------------------------------------------------
  // SESSION RECOVERY
  // -----------------------------------------------------------------
  checkAuth: async () => {
    set({ isLoading: true });
    get().initAuthListener();

    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      // Strict "Remember Me": if the user did NOT check Remember Me on their
      // last login, the SESSION_ALIVE flag (sessionStorage) is cleared whenever
      // the browser is fully closed. If the flag is missing AND remember-me is
      // off, sign them out — they must log in again.
      if (!isRememberMe() && !isSessionAliveFlagSet()) {
        await supabase.auth.signOut();
        clearLastRole();
        set({
          user: null,
          session: null,
          currentRole: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // Tab is alive — keep the flag set so a refresh stays logged in.
      try {
        sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
      } catch {
        // ignore
      }

      try {
        const mapped = await loadAuthUserModel(data.session.user);
        set({
          user: mapped,
          session: data.session,
          currentRole: mapped.last_active_role,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null, needsVerification: false }),

  setPendingEmail: (email) => set({ pendingEmail: email }),

  // -----------------------------------------------------------------
  // SIGNUP
  // -----------------------------------------------------------------
  signup: async (formData, role) => {
    set({ isLoading: true, error: null });

    // Block obviously weak passwords client-side before hitting Supabase
    if (COMMON_PASSWORDS.has(formData.password.toLowerCase())) {
      const err = makeAuthError("WEAK_PASSWORD", "This password is too common.");
      set({ isLoading: false, error: err.message });
      throw err;
    }

    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone ? normalizePhone(formData.phone) : null;

    const { data, error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: formData.name,
          full_name: formData.name,
          phone: phone ?? undefined,
        },
      },
    });

    if (error || !data.user) {
      const err = mapSupabaseAuthError(error?.message ?? "Signup failed");
      set({ isLoading: false, error: err.message });
      throw err;
    }

    // Update profile with phone + business fields if applicable.
    // The handle_new_user trigger created the basic profile row; we
    // augment it now.
    type ProfileUpdate = {
      name?: string;
      phone?: string;
      user_type?: string;
      business_name?: string;
      business_type?: string;
      business_address?: string;
    };
    const profileUpdates: ProfileUpdate = { name: formData.name };
    if (phone) profileUpdates.phone = phone;
    if (role === "agency") {
      profileUpdates.user_type = "business";
      if (formData.businessName) profileUpdates.business_name = formData.businessName;
      if (formData.businessType) profileUpdates.business_type = formData.businessType;
      if (formData.city) profileUpdates.business_address = formData.city;
    }

    // Best-effort — don't fail signup if these don't apply
    await supabase.from("profiles").update(profileUpdates).eq("id", data.user.id);

    if (role === "agency") {
      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "business",
      });
    }

    // If the project has auto-confirm enabled, the user is already
    // signed in — route the UI like a successful login.
    if (data.session?.user) {
      const mapped = await loadAuthUserModel(data.session.user);
      const next: MockUser = { ...mapped, last_active_role: role };
      writeLastRole(role);
      set({
        user: next,
        session: data.session,
        currentRole: role,
        isAuthenticated: true,
        isLoading: false,
        pendingEmail: null,
        needsVerification: false,
      });
      return next;
    }

    // Otherwise we need to wait for email verification.
    const placeholder: MockUser = {
      id: data.user.id,
      email,
      phone,
      password_hash: "",
      created_at: data.user.created_at ?? new Date().toISOString(),
      email_verified: false,
      phone_verified: false,
      name: formData.name,
      roles: {
        renter: { active: role === "renter", profile: null },
        agency: {
          active: role === "agency",
          verified: false,
          profile:
            role === "agency"
              ? {
                  agencyName: formData.businessName,
                  businessType: formData.businessType,
                  city: formData.city,
                }
              : null,
        },
      },
      default_role: role,
      last_active_role: role,
      failed_login_attempts: 0,
      locked_until: null,
    };
    set({
      isLoading: false,
      pendingEmail: email,
      needsVerification: true,
    });
    return placeholder;
  },

  // -----------------------------------------------------------------
  // EMAIL VERIFICATION (OTP-style)
  // -----------------------------------------------------------------
  verifyEmail: async (code, emailOverride) => {
    const email = emailOverride ?? get().pendingEmail ?? get().user?.email ?? "";
    if (!email) throw makeAuthError("USER_NOT_FOUND", "No email to verify");
    set({ isLoading: true, error: null });

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    if (error || !data.user) {
      const err = mapSupabaseAuthError(error?.message ?? "Verification failed");
      set({ isLoading: false, error: err.message });
      throw err;
    }

    const mapped = await loadAuthUserModel(data.user);
    writeLastRole(mapped.last_active_role);
    set({
      user: mapped,
      session: data.session,
      currentRole: mapped.last_active_role,
      isAuthenticated: true,
      isLoading: false,
      pendingEmail: null,
      needsVerification: false,
      error: null,
    });
    return mapped;
  },

  resendVerificationCode: async (emailOverride) => {
    const email = emailOverride ?? get().pendingEmail ?? get().user?.email ?? "";
    if (!email) throw makeAuthError("USER_NOT_FOUND", "No email to resend to");

    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      const err = mapSupabaseAuthError(error.message);
      set({ error: err.message });
      throw err;
    }
    recordVerificationResend(email);
  },

  // -----------------------------------------------------------------
  // PASSWORD RESET
  // -----------------------------------------------------------------
  requestPasswordReset: async (email) => {
    set({ isLoading: true, error: null });
    try {
      // Best-effort client-side rate limit
      checkResetRequestAllowed(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password/new`,
      });
      // Always record the attempt — even if Supabase silently no-ops on
      // a non-existent address, we want to enforce our per-hour cap.
      recordResetResend(email);

      if (error) {
        // For security, surface a generic success unless it's a clear rate-limit
        if (/rate|too many/i.test(error.message)) {
          const err = mapSupabaseAuthError(error.message);
          set({ isLoading: false, error: err.message });
          throw err;
        }
      }
      set({ isLoading: false });
    } catch (err) {
      const e = err as AuthError;
      set({ isLoading: false, error: e.message });
      throw err;
    }
  },

  verifyResetCode: async (email, code) => {
    set({ isLoading: true, error: null });
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: code,
      type: "recovery",
    });
    if (error || !data.session) {
      const err = mapSupabaseAuthError(error?.message ?? "Invalid code");
      set({ isLoading: false, error: err.message });
      throw err;
    }
    // After OTP verify the user has a recovery session; we keep it and
    // hand the UI an opaque token to use on the next page.
    const token = issueResetToken(cleanEmail);
    set({ isLoading: false, session: data.session });
    return token;
  },

  setNewPassword: async (resetToken, newPassword) => {
    set({ isLoading: true, error: null });

    if (newPassword.length < 8) {
      const err = makeAuthError("WEAK_PASSWORD", "Password must be at least 8 characters.");
      set({ isLoading: false, error: err.message });
      throw err;
    }
    if (COMMON_PASSWORDS.has(newPassword.toLowerCase())) {
      const err = makeAuthError("WEAK_PASSWORD", "This password is too common.");
      set({ isLoading: false, error: err.message });
      throw err;
    }

    const email = consumeResetToken(resetToken);
    if (!email) {
      const err = makeAuthError("TOKEN_EXPIRED", "Your reset link expired. Please request a new one.");
      set({ isLoading: false, error: err.message });
      throw err;
    }

    const { data: updated, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error || !updated.user) {
      const err = mapSupabaseAuthError(error?.message ?? "Could not update password");
      set({ isLoading: false, error: err.message });
      throw err;
    }

    const mapped = await loadAuthUserModel(updated.user);
    writeLastRole(mapped.last_active_role);
    set({
      user: mapped,
      currentRole: mapped.last_active_role,
      isAuthenticated: true,
      isLoading: false,
      pendingEmail: null,
      needsVerification: false,
      error: null,
    });
    return mapped;
  },
}));
