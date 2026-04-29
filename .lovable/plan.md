# Admin Unified Clients — Live Walkthrough

Account confirmed in the database:
- Email: abdrahimbamouh56@gmail.com
- Email confirmed: yes (2026-04-27)
- Roles: renter, admin, agency
- admin_employees row: yes
- Profile: verified

So this account can reach `/admin/panel` directly.

## What I'll do (in default mode)

1. **Log in via the preview**
   - Open the preview URL, navigate to `/auth`
   - Fill email + password from the message and submit
   - Confirm redirect lands on a logged-in page (no "Email not confirmed" toast)

2. **Open Admin Unified Clients**
   - Navigate to `/admin/panel?tab=clients`
   - Screenshot the initial table + pill counts (All / Verified / Pending / Rejected / Unverified)

3. **Verified filter check**
   - Click the **Verified** pill
   - Screenshot the filtered table
   - Confirm: only rows with `verification_status = 'verified'` (or `is_verified = true`, depending on which field the pill keys off — I'll verify in code) are shown
   - Confirm the row count in the table matches the number on the Verified pill

4. **Live count update check**
   - Pick a verified row → open the client detail drawer/page
   - Trigger an "unverify" (or whichever inverse action the UI exposes — revoke verification / reject)
   - Return to the Clients tab
   - Confirm: the Verified count decreases by 1, the Unverified/Rejected count increases by 1, and the row moves out of the Verified-filter view without a manual refresh
   - Re-verify the same client to leave data in its original state
   - Confirm the count returns to the original value live

5. **Report back**
   - Post the screenshots inline
   - Note any mismatch between pill counts and the actual filtered row count (this is the known 1000-row client-side count limitation in `mem://constraints/admin-performance` — I'll explicitly check whether it's biting here)
   - Flag any console errors or failed network requests captured during the walkthrough

## Technical notes

- Tools used (default mode only): `browser--navigate_to_sandbox`, `browser--act`, `browser--screenshot`, `browser--observe`, `browser--read_console_logs`, `browser--list_network_requests`
- I will not modify any data permanently — the verify → unverify → re-verify sequence leaves the client in the original verified state
- If the live update does not happen without refresh, I'll capture the failing realtime/refetch behaviour and propose a fix in a follow-up

## What I will NOT do

- Change any production data beyond the temporary toggle described above
- Create migrations or schema changes
- Touch other admin tabs unless something there breaks the Clients walkthrough

Approve this and I'll switch to build mode and run the walkthrough end-to-end.