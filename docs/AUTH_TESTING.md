# Motonita Authentication — Manual Test Plan

> **Last seeded**: 2026-04-24 — see `supabase/functions/seed-test-accounts/index.ts`.
> Re-run the seeder any time via the Edge Function to restore these states.

## Test Accounts

| Email | Password | Role(s) | Email Verified | Agency Verified |
|---|---|---|---|---|
| `renter@test.com` | `Renter123` | renter | ✅ | n/a |
| `business@test.com` | `Business123` | agency | ✅ | ✅ |
| `both@test.com` | `Both123` | renter + agency | ✅ | ✅ |
| `unverified@test.com` | `Unverified123` | renter | ❌ | n/a |

## Test Scenarios

### A. Email + Password Login
| # | Scenario | Expected |
|---|---|---|
| A1 | `renter@test.com` / `Renter123` at `/login` | Toast "Welcome back", redirect to `/rent`. |
| A2 | `business@test.com` / `Business123` at `/agency/login` | Redirect to `/agency/dashboard`. |
| A3 | `both@test.com` / `Both123` at `/login` | Redirect to `/rent` (renter context). |
| A4 | `both@test.com` / `Both123` at `/agency/login` | Redirect to `/agency/dashboard` (agency context). |
| A5 | `unverified@test.com` / `Unverified123` at `/login` | Inline error "Please verify your email first" + Resend button. |
| A6 | `renter@test.com` / WRONG password ×4 | Each attempt shows "Incorrect email or password"; last 2 attempts show "X attempts left before lockout". |
| A7 | `renter@test.com` / WRONG password (5th attempt) | Locked 15 minutes; submit button disabled with countdown. |
| A8 | Submit invalid email format | Inline Zod error, no network call. |

### B. Signup
| # | Scenario | Expected |
|---|---|---|
| B1 | New email at `/signup` with strong password | Account created; redirected to `/verify-email` with email pre-filled. |
| B2 | Reuse existing email | Inline error "This email is already registered." |
| B3 | Weak password (`password123`) | Blocked client-side: "This password is too common." |
| B4 | Password missing uppercase / number | Field-level Zod error. |

### C. Email Verification (`/verify-email`)
| # | Scenario | Expected |
|---|---|---|
| C1 | Enter correct 6-digit code | Toast "Email verified!", routed to renter or agency home. |
| C2 | Enter wrong code | Inline error, fields shake & clear. |
| C3 | Click "Resend code" within 60s | Button shows countdown, no extra email. |
| C4 | Click "Resend code" after 60s | Toast "New code sent". |

### D. Password Reset
| # | Scenario | Expected |
|---|---|---|
| D1 | `/forgot-password` → enter `renter@test.com` → submit | Redirected to `/reset-password/verify?email=…` showing "Check your email". |
| D2 | Click reset link in email | Lands on `/reset-password/new` with active recovery session. |
| D3 | Submit a strong new password | Toast "Password updated!", routed to user's home. |
| D4 | Try common password (`password123`) | Inline rule error. |
| D5 | Direct visit to `/reset-password/new` without link | Toast "Your reset link expired", redirect to `/forgot-password`. |
| D6 | Request reset 4× in one hour | 4th request blocked with "Too many reset requests" + countdown. |

### E. Google OAuth
| # | Scenario | Expected |
|---|---|---|
| E1 | Click "Continue with Google" on `/login` | Google account picker opens; on success, lands on `/rent` (or `/agency/dashboard` if user has agency role). |
| E2 | Cancel mid-flow | Returned to `/login` with no error. |

### F. Session Management
| # | Scenario | Expected |
|---|---|---|
| F1 | Login WITHOUT "Remember me" → close browser → reopen | User is signed out; visiting `/profile` redirects to `/login`. |
| F2 | Login WITH "Remember me" → close browser → reopen | User stays signed in; `/profile` works. |
| F3 | Refresh the page mid-session | User stays signed in either way. |
| F4 | Click logout from header menu | Confirm dialog; on confirm, signed out + toast + redirected to `/login`. |
| F5 | Authenticated user visits `/login`, `/signup`, `/forgot-password`, `/reset-password/new` | Redirected to their home. |

### G. Route Guards
| # | Scenario | Expected |
|---|---|---|
| G1 | Renter visits `/agency/dashboard` | Toast "You don't have access" + redirect to `/rent`. |
| G2 | Agency visits `/rent` | Silent redirect to `/agency/dashboard`. |
| G3 | Unauthenticated visit to `/profile` | Redirected to `/login`. |
| G4 | Agency with `agency.verified === false` | Forced to `/agency/verification`. |

## Manual Steps Required From Owner
1. Provide a valid SMTP / verified email domain in Lovable Cloud → Emails so OTP/recovery emails actually deliver. Until then, view emails in the Supabase Auth log.
2. (Optional) Set up branded email templates via the Lovable Cloud "Emails" panel.
3. (Optional) Configure custom Google OAuth credentials if you want the consent screen to show the Motonita brand.

## Known Limits
- Lockout state is client-side; clearing localStorage resets the counter. Supabase still enforces its server-side limits.
- Rate-limit windows for password reset and verify-resend are also client-side counters.
