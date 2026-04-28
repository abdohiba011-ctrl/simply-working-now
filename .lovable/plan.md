## Problems Identified

### Bug 1 — Clients table shows "No clients found" while top stat cards show counts
In `src/pages/AdminPanel.tsx`, the stat cards correctly use server-side counts (`count: 'exact', head: true`) so they show real numbers (1 Pending, 3 Not Verified). They pass the selected status to `AdminUnifiedClientsTab` via the `statusFilter` prop.

But inside `src/components/admin/AdminUnifiedClientsTab.tsx`:
1. The component initializes `localStatusFilter` from the prop **once**, then **only uses `localStatusFilter`** for filtering. When the parent updates `statusFilter` (by clicking a card), the prop change is ignored — there is no `useEffect` syncing it.
2. The "Clear filter" button at the AdminPanel level resets parent `statusFilter` to `"all"` but the child still holds the previous `localStatusFilter` value.
3. The result effect uses `clients.filter(...)` directly (not from the search-filtered set), so the filter pill at the top (`All 0`, `Verified 0`…) always shows zero counts because the local stats are computed from the truncated list (no rows because none of the visible 4 profiles were fetched after status filter was already applied client-side, OR the `or('user_type.is.null,user_type.eq.client')` returns rows but the filter kicks in incorrectly).
4. Looking at the screenshot: stats badges show "All 0 / Verified 0 / Pending 0 / Not Started 0 / Blocked 0" — `clients` array is empty. Since the parent sends `statusFilter="not_verified"` (Not Verified card was clicked), but the profiles `select(...)` query in the child has no row limit issue (only 4 profiles exist). The empty result must come from the `.or('user_type.is.null,user_type.eq.client')` filter. In the database, every `user_type` is `'renter'`, not `'client'`, so the OR condition matches **zero rows**.

This is the actual root cause: profiles use `user_type = 'renter'` but the admin clients tab queries for `user_type IS NULL OR user_type = 'client'`.

### Bug 2 — Admin doesn't see agency verification documents
When an agency uploads documents in `src/pages/agency/Verification.tsx`, the files are stored in the `client_files` table keyed by `user_id`. RLS on `client_files` only allows the file owner to SELECT them, so admins **cannot read them at all**.

Additionally, the admin agency verifications page (`src/pages/admin/AdminAgencyVerifications.tsx`) lists agencies but does not display the uploaded RC / AE card / ID front / ID back documents.

## Fixes

### Fix 1 — Admin Clients tab shows rows
**File:** `src/components/admin/AdminUnifiedClientsTab.tsx`
- Change the `fetchClients` query from `.or('user_type.is.null,user_type.eq.client')` to `.or('user_type.is.null,user_type.eq.client,user_type.eq.renter')` so renter profiles (the actual client accounts) are included. Renters ARE the clients.
- Add a `useEffect` that syncs `localStatusFilter` from the `statusFilter` prop whenever it changes, so clicking the parent stat cards updates the filter.
- Update the filter logic so the "Not Started" badge (named `not_verified` internally) matches the parent definition: `!is_verified` AND `verification_status` not in (`'pending_review'`, `'rejected'`).
- Recompute the local stats based on the freshly fetched `clients` (already done) — verify counts match the parent cards (4 total, 1 pending, 3 not verified).

### Fix 2 — Admin can read & view agency verification documents

**Migration (RLS for client_files):**
- Add an admin SELECT policy on `public.client_files`:
  ```sql
  CREATE POLICY "Admins can view all client files"
    ON public.client_files FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  ```

**File:** `src/pages/admin/AdminAgencyVerifications.tsx`
- After loading pending agencies, for each agency fetch the owner's `client_files` (filter by the agency's `profile.user_id`, slot prefixes: `rc-`, `ae_card-`, `id_front-`, `id_back-`).
- Display each document as a thumbnail / link inside the agency card, with file name + open-in-new-tab link. Use signed URLs from the `client-files` storage bucket if needed (or the public `file_url` already stored).
- Show a small badge when a slot is missing ("RC missing", "ID Front missing") so the admin can spot incomplete submissions before approving.
- Keep existing Approve / Reject buttons, but disable Approve when required documents are missing.

**File:** `src/components/admin/client-details/ClientNotesFilesTab.tsx` (already used for client details)
- Verify it already lists `client_files` for the selected user. Since admin can now SELECT them via the new RLS policy, the verification documents will appear in the existing client details Files tab automatically — no further change required there.

## Out of Scope
- No redesign of the agency Verification page (already done in the previous step).
- No changes to the renter Verification page.
- No new tables; only one RLS policy is added.

## Verification Steps After Implementation
1. Log in as admin, open `/admin/panel?tab=clients` — confirm 4 client rows are listed and stat counts (1 Pending, 3 Not Verified) match badge counts.
2. Click each stat card — confirm the table re-filters and the "Clear filter" button resets it.
3. Open `/admin/agencies/verifications` — confirm the pending agency "Agency" appears with 4 document thumbnails (RC, AE card, ID Front, ID Back).
4. Open the client details page for the agency owner — confirm documents are listed in the Files tab.
