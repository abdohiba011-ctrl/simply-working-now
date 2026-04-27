## Goal

Make role-based UI (Admin Panel, Switch to Agency) appear reliably right after login, prevent the `admin_employees` ↔ `user_roles` desync from happening again, and tighten linter-flagged SECURITY DEFINER functions.

## 1. Auto-sync `admin_employees` → `user_roles`

Add a database trigger so the two tables can never drift again.

- New trigger function `public.sync_admin_role_to_user_roles()` (SECURITY DEFINER, `search_path=public`):
  - On INSERT into `admin_employees` → INSERT `(user_id, 'admin')` into `user_roles` (ON CONFLICT DO NOTHING).
  - On DELETE from `admin_employees` → DELETE matching `user_roles` row (only if user has no other source of admin).
- Trigger `trg_admin_employees_sync_roles` AFTER INSERT OR DELETE on `admin_employees`.
- Backfill: re-run the insert for any current admin missing the role (idempotent).

Self-test view/function `public.admin_role_sync_status()` returning rows where `admin_employees.user_id` has no matching `user_roles.role='admin'`. Empty result = healthy. Used by:
- Admin panel "System health" card (read-only).
- Optional: a daily check we can call manually.

## 2. Triage SECURITY DEFINER linter warnings

The linter flagged 44 warnings (categories 0028 anon-callable, 0029 authenticated-callable). Audit each `SECURITY DEFINER` function and apply one of three actions:

| Function | Action |
|---|---|
| `has_role`, `is_super_admin` | Keep DEFINER (used in RLS); REVOKE EXECUTE FROM `anon`. Keep `authenticated`. |
| `create_bike_hold`, `promote_hold_to_booking`, `confirm_booking`, `request_plan_downgrade`, `credit_renter_wallet`, `log_audit_event` | Keep DEFINER + auth check inside (already present); REVOKE EXECUTE FROM `anon`. |
| `bookings_*`, `profiles_*`, `booking_messages_*`, `audit_booking_message`, `update_updated_at_column`, `handle_new_user`, `handle_new_agency_role`, `guard_user_roles_write`, `enforce_subscription_lifecycle`, `sync_admin_role_to_user_roles` (new) | Trigger / internal only — REVOKE EXECUTE FROM `PUBLIC`, `anon`, `authenticated`. |
| `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` | Service-role only — REVOKE EXECUTE FROM `PUBLIC`, `anon`, `authenticated`. |

Result: anon cannot RPC-call any SECURITY DEFINER function; authenticated keeps only the few RPCs the app actually invokes from the browser.

## 3. Force role refresh after login

`AuthContext`:
- Expose new method `refreshRoles()` that re-runs `fetchUserRoles(user.id)` and also calls `useAuthStore.getState().checkAuth()`.
- After successful `login()` and `signup()`, await `refreshRoles()` before resolving so the dropdown reflects roles immediately.
- On `SIGNED_IN` event, call `refreshRoles()` (currently roles are fetched but the parallel `useAuthStore` may lag).

## 4. "Role status" indicator in profile dropdown

In `Header.tsx` dropdown (under `My Account` label):

```
Role status
  ● admin     ● agency     ● user
```

- Each pill shows green if the role is present in `userRoles`, gray otherwise.
- Small "Refresh" icon button next to it calls `refreshRoles()` and shows a spinner during the call.
- Same pills mirrored in the mobile menu account section.
- Tooltip on each pill: "Loaded from user_roles table".

This gives you (and any user) instant visual confirmation of which roles are active without DB access.

## 5. Verification

After deploy:
1. You sign out → sign back in.
2. Open avatar dropdown — Role status pills should show admin + agency green.
3. "Admin Panel" and "Switch to business" items visible.
4. Run `SELECT * FROM admin_role_sync_status()` — returns 0 rows.
5. Re-run Supabase linter — 0028/0029 warnings drop to only the handful of RPCs we intentionally keep callable by `authenticated`.

## Files to change

- New migration: trigger + sync function + grants/revokes for all SECURITY DEFINER functions + `admin_role_sync_status()`.
- `src/contexts/AuthContext.tsx` — add `refreshRoles`, await it on login/signup.
- `src/components/Header.tsx` — Role status pills + refresh button (desktop + mobile).
- Optional: `src/components/admin/SystemHealthCard.tsx` showing sync status (can defer).
