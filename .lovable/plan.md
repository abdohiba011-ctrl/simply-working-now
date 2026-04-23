

## The problem

Your screenshot shows two separate issues on the login page:

### 1. `[MISSING: mockAuth.login_continue_renter]` text everywhere

Your i18n config (`src/i18n/index.ts`) has a `parseMissingKeyHandler` that returns `[MISSING: <key>]` in dev mode **before** i18next ever looks at the `defaultValue` you pass in `t(key, { defaultValue: "..." })`. So even though `Login.tsx` provides English fallbacks like `"Are you a business?"` and `"Log in here"`, they never render — the missing-key handler intercepts first.

Three keys are missing from all three locale files (`en.json`, `fr.json`, `ar.json`):
- `mockAuth.login_continue_renter`
- `mockAuth.are_you_business`
- `mockAuth.login_here`

(And likely a few more under the `mockAuth.*` namespace used by the new auth pages.)

### 2. "Incorrect email or password" for a real account

You tried to log in as `abdrahimbamouh56@gmail.com` — that user **exists in your real Supabase database** (you're viewing his admin profile at `/admin/clients/4e6fd364-...`). But the login form does **not** call Supabase. It calls `useAuthStore.login()`, which calls `mockLogin()` from `src/lib/mockAuth.ts` — an in-memory mock with only 4 hardcoded test accounts:

- `renter@test.com` / `Renter123`
- `business@test.com` / (similar)
- `both@test.com` / ...
- one more seed

Real Supabase users **cannot** authenticate through the mock. This is an architectural mismatch from the recent 4-paste auth rebuild: the new mock auth replaced the real Supabase auth on the renter/agency login pages, while the rest of the app (admin panel, profiles, bookings) still uses real Supabase.

## The fix — two parts

### Part A: Add the missing translation keys (quick)

Add to all three locale files under the existing `mockAuth` block:

```json
"login_continue_renter": "Log in to find your next ride",
"login_continue_agency": "Log in to manage your fleet and bookings",
"are_you_business": "Are you a business?",
"are_you_renter": "Are you a renter?",
"login_here": "Log in here"
```

Plus French + Arabic equivalents. Also audit `Signup.tsx`, `ForgotPassword.tsx`, `VerifyEmail.tsx`, `ResetPasswordVerify.tsx`, `ResetPasswordNew.tsx`, and `SignupExtra.tsx` for any other `mockAuth.*` keys missing from the JSON files, and add them all in one pass.

### Part B: Decide what to do about mock vs. real auth

This is the bigger question and I need your call before I touch it. Pick one:

**Option 1 — Replace mock auth with real Supabase auth (recommended)**
Rewrite `useAuthStore` to call `supabase.auth.signInWithPassword`, `signUp`, `resetPasswordForEmail`, etc. Map the Supabase user + the existing `profiles`, `user_roles`, and `admin_employees` tables into the same `MockUser` shape the UI already consumes, so all the new login/signup/role-switch UI keeps working unchanged. Real users like `abdrahimbamouh56@gmail.com` will then actually be able to log in. This is the correct end state.

**Option 2 — Keep the mock, just unblock testing**
Add a banner on the login page listing the 4 test accounts, and seed any extra accounts you want to demo. The real `abdrahimbamouh56@gmail.com` user still won't be able to log in via the renter/agency doors — only via the admin panel flow (which uses real Supabase). This is fine if you're still in design/prototype mode.

**Option 3 — Just fix the translations**
Do only Part A. Logins still won't work for real users; you accept that for now.

## What I'll do once you choose

- **If Option 1:** Part A + rewrite `useAuthStore` against Supabase, wire `email_verified` to `auth.users.email_confirmed_at`, derive `roles.agency.active/verified` from `user_roles` + `profiles.business_status`, keep `routeAfterAuth.ts` and all the role-switching UI untouched, remove the in-memory seed users and rate limiter (Supabase handles that).
- **If Option 2:** Part A + add a dev-only "test accounts" hint panel on `/login` and `/agency/login`.
- **If Option 3:** Part A only.

Which option do you want?

