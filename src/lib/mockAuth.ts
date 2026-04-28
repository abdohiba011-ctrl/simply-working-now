/**
 * Auth domain types + small client-side helpers.
 *
 * Despite the legacy name, this file no longer holds an in-memory mock
 * backend. The real auth backend is Supabase (see `useAuthStore`). This
 * module just defines the user shape the UI consumes and a few
 * client-side rate-limit counters / validation helpers.
 */

export type AppRole = "renter" | "agency";

export interface RoleConfig {
  active: boolean;
  verified?: boolean;
  profile: Record<string, unknown> | null;
}

/**
 * The shape every auth-aware UI in this app reads. We map the Supabase
 * user + the `profiles` and `user_roles` tables into this object inside
 * `useAuthStore`.
 */
export interface MockUser {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string; // unused; kept for type-compat with old UI code
  created_at: string;
  email_verified: boolean;
  phone_verified: boolean;
  name: string;
  roles: {
    renter: RoleConfig;
    agency: RoleConfig & { verified: boolean };
  };
  default_role: AppRole;
  last_active_role: AppRole;
  failed_login_attempts: number;
  locked_until: string | null;
  suspended?: boolean;
  isAdmin?: boolean;
}

export interface AuthError extends Error {
  code:
    | "INVALID_CREDENTIALS"
    | "EMAIL_NOT_VERIFIED"
    | "ACCOUNT_LOCKED"
    | "ACCOUNT_SUSPENDED"
    | "RATE_LIMITED"
    | "EMAIL_TAKEN"
    | "WEAK_PASSWORD"
    | "INVALID_CODE"
    | "CODE_EXPIRED"
    | "RESEND_COOLDOWN"
    | "USER_NOT_FOUND"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "RESET_RATE_LIMITED"
    | "OAUTH_ONLY"
    | "NETWORK";
  needsVerification?: boolean;
  lockedUntil?: string;
  retryAfterMs?: number;
  attemptsLeft?: number;
}

export interface SignupFormData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  // business-only
  businessName?: string;
  businessType?: string;
  city?: string;
  numBikes?: string;
  // marketing
  marketingOptIn?: boolean;
}

export interface AgencyExtraData {
  businessName: string;
  businessType: string;
  city: string;
  neighborhood?: string;
  numBikes: string;
  phone?: string;
}

export function makeAuthError(
  code: AuthError["code"],
  message: string,
  extra?: Partial<AuthError>,
): AuthError {
  const err = new Error(message) as AuthError;
  err.code = code;
  Object.assign(err, extra);
  return err;
}

// =====================================================================
// Identifier helpers
// =====================================================================

const PHONE_REGEX = /^(\+212|00212|0)[67]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function detectIdentifierType(value: string): "email" | "phone" | "unknown" {
  const trimmed = value.trim();
  if (EMAIL_REGEX.test(trimmed)) return "email";
  if (PHONE_REGEX.test(trimmed.replace(/\s+/g, ""))) return "phone";
  return "unknown";
}

export function normalizePhone(input: string): string | null {
  const compact = input.replace(/\s+/g, "");
  if (!PHONE_REGEX.test(compact)) return null;
  if (compact.startsWith("+212")) return compact;
  if (compact.startsWith("00212")) return "+212" + compact.slice(5);
  if (compact.startsWith("0")) return "+212" + compact.slice(1);
  return compact;
}

// =====================================================================
// Common-password blacklist (used by signup + reset forms)
// =====================================================================

export const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "qwerty",
  "12345678",
  "motonita123",
  "123456789",
  "azerty123",
]);

// =====================================================================
// Client-side cooldown / lockout counters
// These are best-effort, in-memory, and only used to keep the UI honest.
// Supabase enforces the real limits server-side.
// =====================================================================

const lockouts = new Map<string, number>(); // identifier → unlockAt ms
const verificationResendAt = new Map<string, number>(); // email → lastSentAt ms
const resetResendAt = new Map<string, number>(); // email → lastSentAt ms
const resetRequestTimestamps = new Map<string, number[]>(); // email → request times

const LOCK_DURATION_MS = 15 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_REQUESTS_PER_WINDOW = 3;

export function recordLockout(identifier: string, durationMs = LOCK_DURATION_MS): void {
  lockouts.set(identifier.toLowerCase().trim(), Date.now() + durationMs);
}

export function clearLockout(identifier: string): void {
  lockouts.delete(identifier.toLowerCase().trim());
}

export function getLockoutRemainingMs(identifier: string): number {
  const until = lockouts.get(identifier.toLowerCase().trim());
  if (!until) return 0;
  const remaining = until - Date.now();
  if (remaining <= 0) {
    lockouts.delete(identifier.toLowerCase().trim());
    return 0;
  }
  return remaining;
}

export function recordVerificationResend(email: string): void {
  verificationResendAt.set(email.toLowerCase().trim(), Date.now());
}

export function getResendCooldownMs(email: string): number {
  const last = verificationResendAt.get(email.toLowerCase().trim());
  if (!last) return 0;
  return Math.max(0, VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - last));
}

export function recordResetResend(email: string): void {
  const key = email.toLowerCase().trim();
  resetResendAt.set(key, Date.now());
  const stamps = resetRequestTimestamps.get(key) ?? [];
  const now = Date.now();
  const pruned = stamps.filter((t) => now - t < RESET_REQUEST_WINDOW_MS);
  pruned.push(now);
  resetRequestTimestamps.set(key, pruned);
}

export function getResetResendCooldownMs(email: string): number {
  const last = resetResendAt.get(email.toLowerCase().trim());
  if (!last) return 0;
  return Math.max(0, RESET_RESEND_COOLDOWN_MS - (Date.now() - last));
}

export function getResetRequestLockoutMs(email: string): number {
  const key = email.toLowerCase().trim();
  const stamps = resetRequestTimestamps.get(key) ?? [];
  const now = Date.now();
  const pruned = stamps.filter((t) => now - t < RESET_REQUEST_WINDOW_MS);
  resetRequestTimestamps.set(key, pruned);
  if (pruned.length < RESET_MAX_REQUESTS_PER_WINDOW) return 0;
  const oldest = pruned[0];
  return Math.max(0, RESET_REQUEST_WINDOW_MS - (now - oldest));
}

export function checkResetRequestAllowed(email: string): void {
  const lockMs = getResetRequestLockoutMs(email);
  if (lockMs > 0) {
    throw makeAuthError(
      "RESET_RATE_LIMITED",
      "Too many reset requests. Please try again later.",
      { retryAfterMs: lockMs },
    );
  }
}

// =====================================================================
// Reset-token short-lived store
// After we verify a recovery OTP we get a Supabase session. We keep an
// opaque token client-side to keep the existing 3-step UI (verify → new
// password) working without exposing the raw access token in the URL.
// =====================================================================

interface ResetSession {
  email: string;
  expiresAt: number;
}

const resetSessions = new Map<string, ResetSession>();
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

export function issueResetToken(email: string): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  const token = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  resetSessions.set(token, {
    email: email.toLowerCase().trim(),
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });
  return token;
}

export function consumeResetToken(token: string): string | null {
  const entry = resetSessions.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    resetSessions.delete(token);
    return null;
  }
  resetSessions.delete(token);
  return entry.email;
}

export function isResetTokenValid(token: string): boolean {
  const entry = resetSessions.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    resetSessions.delete(token);
    return false;
  }
  return true;
}

// =====================================================================
// Verification resend — talks to Supabase
// Kept here so existing `import { mockResendVerification } from "@/lib/mockAuth"`
// callsites keep working.
// =====================================================================

export async function mockResendVerification(emailOrPhone: string): Promise<void> {
  const email = emailOrPhone.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw makeAuthError("USER_NOT_FOUND", "Enter your email address to resend.");
  }

  const cooldown = getResendCooldownMs(email);
  if (cooldown > 0) {
    throw makeAuthError(
      "RESEND_COOLDOWN",
      `Please wait ${Math.ceil(cooldown / 1000)}s before requesting a new code.`,
      { retryAfterMs: cooldown },
    );
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) {
    throw makeAuthError("NETWORK", error.message);
  }
  recordVerificationResend(email);
}
