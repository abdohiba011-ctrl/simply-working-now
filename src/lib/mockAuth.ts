/**
 * Mock authentication backend for Motonita.
 * Simulates a real backend with realistic latency and rate limiting.
 * NOTE: This is purely client-side / in-memory and seeded for development.
 */

export type AppRole = "renter" | "agency";

export interface RoleConfig {
  active: boolean;
  verified?: boolean;
  profile: Record<string, unknown> | null;
}

export interface MockUser {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string; // plain text for the mock — DO NOT do this in production
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
}

export interface AuthError extends Error {
  code:
    | "INVALID_CREDENTIALS"
    | "EMAIL_NOT_VERIFIED"
    | "ACCOUNT_LOCKED"
    | "ACCOUNT_SUSPENDED"
    | "RATE_LIMITED"
    | "NETWORK";
  needsVerification?: boolean;
  lockedUntil?: string;
  retryAfterMs?: number;
}

const RATE_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// In-memory rate limit tracker (resets on full page reload — acceptable for mock)
const attemptLog = new Map<string, { count: number; firstAttemptAt: number; lockedUntil: number | null }>();

// Seed users
const seedUsers: MockUser[] = [
  {
    id: "user_renter",
    email: "renter@test.com",
    phone: null,
    password_hash: "Renter123",
    created_at: new Date("2024-01-15").toISOString(),
    email_verified: true,
    phone_verified: false,
    name: "Youssef",
    roles: {
      renter: { active: true, profile: { displayName: "Youssef" } },
      agency: { active: false, verified: false, profile: null },
    },
    default_role: "renter",
    last_active_role: "renter",
    failed_login_attempts: 0,
    locked_until: null,
  },
  {
    id: "user_business",
    email: "business@test.com",
    phone: null,
    password_hash: "Business123",
    created_at: new Date("2024-02-10").toISOString(),
    email_verified: true,
    phone_verified: false,
    name: "Atlas Motors",
    roles: {
      renter: { active: false, profile: null },
      agency: {
        active: true,
        verified: true,
        profile: { agencyName: "Atlas Motors", city: "Casablanca" },
      },
    },
    default_role: "agency",
    last_active_role: "agency",
    failed_login_attempts: 0,
    locked_until: null,
  },
  {
    id: "user_both",
    email: "both@test.com",
    phone: null,
    password_hash: "Both123",
    created_at: new Date("2024-03-05").toISOString(),
    email_verified: true,
    phone_verified: false,
    name: "Sara",
    roles: {
      renter: { active: true, profile: { displayName: "Sara" } },
      agency: {
        active: true,
        verified: true,
        profile: { agencyName: "Sara Rentals", city: "Marrakech" },
      },
    },
    default_role: "agency",
    last_active_role: "agency",
    failed_login_attempts: 0,
    locked_until: null,
  },
  {
    id: "user_unverified",
    email: "unverified@test.com",
    phone: null,
    password_hash: "Unverified123",
    created_at: new Date("2024-04-01").toISOString(),
    email_verified: false,
    phone_verified: false,
    name: "Karim",
    roles: {
      renter: { active: true, profile: null },
      agency: { active: false, verified: false, profile: null },
    },
    default_role: "renter",
    last_active_role: "renter",
    failed_login_attempts: 0,
    locked_until: null,
  },
];

// Mutable user table
const users: Map<string, MockUser> = new Map(
  seedUsers.map((u) => [u.email.toLowerCase(), u]),
);

const PHONE_REGEX = /^(\+212|00212|0)[67]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function detectIdentifierType(value: string): "email" | "phone" | "unknown" {
  const trimmed = value.trim();
  if (EMAIL_REGEX.test(trimmed)) return "email";
  if (PHONE_REGEX.test(trimmed.replace(/\s+/g, ""))) return "phone";
  return "unknown";
}

function delay(min = 500, max = 1500) {
  const ms = Math.floor(min + Math.random() * (max - min));
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function makeError(code: AuthError["code"], message: string, extra?: Partial<AuthError>): AuthError {
  const err = new Error(message) as AuthError;
  err.code = code;
  Object.assign(err, extra);
  return err;
}

export function mockCheckRateLimit(identifier: string): void {
  const key = identifier.toLowerCase().trim();
  const entry = attemptLog.get(key);
  if (!entry) return;

  const now = Date.now();

  // Locked?
  if (entry.lockedUntil && now < entry.lockedUntil) {
    throw makeError(
      "ACCOUNT_LOCKED",
      "Too many failed attempts. Please try again in 15 minutes.",
      { lockedUntil: new Date(entry.lockedUntil).toISOString(), retryAfterMs: entry.lockedUntil - now },
    );
  }

  // Window expired? Reset.
  if (now - entry.firstAttemptAt > RATE_WINDOW_MS) {
    attemptLog.delete(key);
  }
}

function recordFailedAttempt(identifier: string): void {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const existing = attemptLog.get(key);

  if (!existing || now - existing.firstAttemptAt > RATE_WINDOW_MS) {
    attemptLog.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null });
    return;
  }

  const next = { ...existing, count: existing.count + 1 };
  if (next.count >= MAX_ATTEMPTS) {
    next.lockedUntil = now + LOCK_DURATION_MS;
  }
  attemptLog.set(key, next);
}

function clearAttempts(identifier: string): void {
  attemptLog.delete(identifier.toLowerCase().trim());
}

function findUser(identifier: string): MockUser | undefined {
  const trimmed = identifier.trim().toLowerCase();
  // Email lookup
  if (users.has(trimmed)) return users.get(trimmed);
  // Phone lookup (normalize to +212 form)
  const normalized = normalizePhone(trimmed);
  if (!normalized) return undefined;
  for (const u of users.values()) {
    if (u.phone && normalizePhone(u.phone) === normalized) return u;
  }
  return undefined;
}

function normalizePhone(input: string): string | null {
  const compact = input.replace(/\s+/g, "");
  if (!PHONE_REGEX.test(compact)) return null;
  if (compact.startsWith("+212")) return compact;
  if (compact.startsWith("00212")) return "+212" + compact.slice(5);
  if (compact.startsWith("0")) return "+212" + compact.slice(1);
  return compact;
}

export async function mockLogin(emailOrPhone: string, password: string): Promise<MockUser> {
  await delay();
  mockCheckRateLimit(emailOrPhone);

  const user = findUser(emailOrPhone);
  if (!user || user.password_hash !== password) {
    recordFailedAttempt(emailOrPhone);
    throw makeError("INVALID_CREDENTIALS", "Incorrect email or password. Please try again.");
  }

  if (user.suspended) {
    throw makeError("ACCOUNT_SUSPENDED", "Your account has been suspended. Contact support.");
  }

  if (!user.email_verified) {
    throw makeError("EMAIL_NOT_VERIFIED", "Please verify your email first.", {
      needsVerification: true,
    });
  }

  clearAttempts(emailOrPhone);
  // Return a clone to prevent mutation of seed
  return { ...user, roles: { ...user.roles } };
}

export async function mockResendVerification(emailOrPhone: string): Promise<void> {
  await delay(300, 800);
  // No-op for mock; in real life would trigger an email
}

export function getLockoutRemainingMs(identifier: string): number {
  const entry = attemptLog.get(identifier.toLowerCase().trim());
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}
