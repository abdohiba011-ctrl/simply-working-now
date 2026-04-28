# Fix renter verification flow (persist, notify, show status)

## What's broken (root cause)

Every verification-related query targets the wrong column on `profiles`. The `profiles` table is keyed by `user_id` (= `auth.uid()`). The verification code uses `.eq('id', user.id)` everywhere — `id` is the profile row's own PK, not the auth user id. The filter matches **0 rows**, so:

1. The `UPDATE` on submit silently affects 0 rows → `verification_status` never flips to `pending_review`, `id_front_image_url` / `selfie_with_id_url` are never saved. Confirmed: `SELECT … FROM profiles WHERE verification_status <> 'unverified'` returns 0 rows.
2. The status `SELECT` on page load also returns nothing → user always sees `not_started` → keeps re-submitting.
3. The admin queue at `/admin/verifications` lists nothing (no rows in `pending_review`), so there's nothing to act on. The notification IS inserted, but the linked profile never updates and the admin has nothing to review.
4. Admin approve/reject/block buttons also use `.eq('id', userId)` → would silently no-op even if a row existed.

There's also no admin notification bell, so even when the `notifications` row is inserted, an admin only sees it if they manually open `/notifications`.

## Changes

### 1. Fix the column-name bug everywhere (the actual blocker)

Replace `.eq('id', …)` with `.eq('user_id', …)` for all `profiles` queries in:
- `src/pages/Verification.tsx` — load (line 178) and submit update (line 449)
- `src/pages/AdminVerifications.tsx` — approve (line 76), reject (line 106), block (line 136)
- `src/pages/UserVerificationDetails.tsx` — load (line 79), approve (line 162), reject (line 198), block (line 235)

After this single fix the submission persists, the admin queue populates, and approve/reject works.

### 2. Make submission state truly persistent

In `Verification.tsx`:
- Stamp `submitted_at = new Date().toISOString()` in the update payload (column already exists).
- On load, if `verification_status` is `pending_review`, `verified`, or `rejected`, render the read-only status card (already exists for `pending_review` at line 663) instead of the upload form. Add the same gating for `verified` (success card) and `rejected` (banner + allow resubmit since rejection is the one case where re-upload is intended).
- If `is_verified = true`, keep the existing redirect.

### 3. Show a clear status badge

- Add a small `VerificationStatusBadge` (uses existing badge component) shown:
  - In the user header/profile menu (next to name) — `Pending`, `Verified`, `Rejected`, or nothing if unverified.
  - At the top of `Verification.tsx` whenever a status exists.
- Disable the "Submit" button while `verification_status === 'pending_review'`.

### 4. Reliable admin notification pipeline

Currently only renter-side code inserts admin notifications inline, which fails silently if the `notifications` insert is blocked or the admin list query returns nothing. Replace with a database trigger so it can never be skipped:

- Migration: `notify_admins_on_verification_submit` AFTER UPDATE trigger on `public.profiles` that fires when `NEW.verification_status = 'pending_review'` AND `OLD.verification_status IS DISTINCT FROM 'pending_review'`. It inserts one `notifications` row per admin (`user_roles WHERE role = 'admin'`) with `link = '/admin/verifications/' || NEW.user_id`.
- Remove the inline admin-notification block from `Verification.tsx` (now handled by the trigger).

### 5. Admin notifications bell

In `src/pages/AdminPanel.tsx` header, add a bell icon that:
- Counts unread `notifications` for the current admin (`is_read = false`).
- Lists the latest 10 with click-through to `link`.
- Subscribes to realtime inserts on `notifications` filtered by `user_id = auth.uid()` so new submissions appear instantly.

Also surface a "Verifications" tab/card on `/admin/panel` showing the count of profiles with `verification_status = 'pending_review'`, linking to `/admin/verifications`.

### 6. Small cleanups

- Toast wording on resubmit-after-reject: keep the existing rejection banner (already implemented), just make sure the form re-enables only for `rejected`.
- Add an index to speed up the admin queue: `CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status) WHERE verification_status = 'pending_review';`

## Files

- `src/pages/Verification.tsx` — fix `.eq` keys, add `submitted_at`, gate UI by status, show badge.
- `src/pages/AdminVerifications.tsx` — fix `.eq` keys.
- `src/pages/UserVerificationDetails.tsx` — fix `.eq` keys.
- `src/pages/AdminPanel.tsx` — add notifications bell + pending-verifications card.
- `src/components/VerificationStatusBadge.tsx` — new tiny component.
- New migration — admin-notify trigger + index.

## Out of scope

- No changes to RLS (existing `Users can update own profile` policy already permits the corrected update).
- No changes to upload buckets or storage policies (those were fixed earlier).
- No new edge functions needed.
