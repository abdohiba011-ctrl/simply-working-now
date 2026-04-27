# Fix: Admin panel + Agency dashboard switcher not visible for abdrahimbamouh56@gmail.com

## Diagnosis (confirmed against the database)

User `abdrahimbamouh56@gmail.com` (Casa Moto Rent, id `4e6fd364-966c-4bdf-82cf-6805f2ee7634`):

| Table | State | Expected |
|---|---|---|
| `profiles` | `user_type=agency`, `is_verified=true`, `verification_status=verified`, `subscription_plan=pro` | ✅ correct |
| `admin_employees` | row present, `is_super_admin=true`, `role=admin` | ✅ correct |
| `user_roles` | **empty for this user** | ❌ should have `admin` and `agency` |

The UI gates everything (the menu's "Admin" link and the "Switch to Agency" item) off `user_roles` via `hasRole(...)` in `AuthContext` and `useAuthStore`. Because that table is empty for them, both controls are hidden — even though `profiles` and `admin_employees` say they qualify.

This is a recurring sync gap: `admin_employees` and `profiles.user_type` are written, but `user_roles` is not.

## Fix (two parts)

### 1. Immediate: backfill the missing rows for this user

Migration that inserts the missing roles (idempotent):

```sql
insert into public.user_roles (user_id, role)
values
  ('4e6fd364-966c-4bdf-82cf-6805f2ee7634', 'admin'),
  ('4e6fd364-966c-4bdf-82cf-6805f2ee7634', 'agency')
on conflict (user_id, role) do nothing;
```

(If `app_role` enum doesn't include `agency`, use whatever value the store reads — likely `business`. I'll verify the enum and the exact value `useAuthStore` looks for before running the migration.)

After this runs, the user just needs to **log out and log back in** so the client refetches roles. Then:
- The avatar dropdown will show **Admin Panel** (route `/admin`).
- It will also show **Switch to Agency Dashboard** (route `/agency/agency-center`).

### 2. Prevent recurrence: backfill all out-of-sync accounts + auto-sync going forward

a. One-shot backfill for every user already in a desynced state:

```sql
-- Anyone in admin_employees but missing the 'admin' role
insert into public.user_roles (user_id, role)
select ae.user_id, 'admin'::app_role
from public.admin_employees ae
on conflict do nothing;

-- Anyone with profiles.user_type='agency' but missing the agency role
insert into public.user_roles (user_id, role)
select p.id, 'agency'::app_role
from public.profiles p
where p.user_type = 'agency'
on conflict do nothing;
```

b. Add a database trigger so future inserts/updates to `admin_employees` and `profiles.user_type` automatically maintain `user_roles`. This kills the desync class of bug for good.

## How to tell the user (suggested message)

> Your account `abdrahimbamouh56@gmail.com` is correctly set as both a super-admin and a verified agency in the database, but a role-sync row was missing, which is why the menu wasn't showing the Admin Panel link or the "Switch to Agency Dashboard" option. I'm fixing that now. Once it's done, please **sign out and sign back in**, then click your avatar (top right) — you'll see:
> - **Admin Panel** → opens `/admin`
> - **Switch to Agency Dashboard** → opens `/agency/agency-center`

## Files / changes

- New migration: backfill rows for this user + global backfill + sync triggers.
- No frontend code changes needed — the gating logic is correct; the data was wrong.

## Verification after apply

```sql
select role from public.user_roles where user_id = '4e6fd364-966c-4bdf-82cf-6805f2ee7634';
-- expect: admin, agency
```

Then have the user log out, log back in, and confirm both menu items appear.
