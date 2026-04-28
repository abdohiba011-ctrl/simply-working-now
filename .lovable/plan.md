## Goal

Two changes to the admin panel:

1. **Remove the "Pricing" tab** entirely — pricing is now set by each agency, not by admins.
2. **Merge "Individual Owners" and "Rental Shops"** tabs into a single tab called **"Business Clients"** (keep the existing "Clients" tab for renters separate).

## Changes

### 1. Remove pricing
In `src/pages/AdminPanel.tsx`:
- Remove the `pricing` value from `TabValue`, the `TAB_PERMISSION_MAP` entry, the tab definition (line 81), and the render block (lines 263–267).
- Remove the import of `AdminPricingTab` (line 18) and the `Tag` icon if unused elsewhere.
- Delete `src/components/admin/AdminPricingTab.tsx`.

The `pricing_tiers` database table and the `usePricingTiers` hook stay untouched (other parts of the app may still read them; no agency-side change is requested).

### 2. Merge Individual Owners + Rental Shops → Business Clients

Create `src/components/admin/AdminBusinessClientsTab.tsx`:
- Loads all profiles where `user_type = 'business'` (no `business_type` filter).
- Adds a Type filter (All / Shops / Individuals) and shows the type as a badge on each row.
- Keeps both action surfaces:
  - Approved Businesses table (search, view, send notification, freeze/unfreeze).
  - Pending Applications table (showing both `partnerType: 'shop'` and `partnerType: 'individual'` from `contact_messages` of type `business_application`); approve assigns the correct `business_type` based on the applicant's `partnerType`.

In `src/pages/AdminPanel.tsx`:
- Replace `individual-owners` and `rental-shops` tab values with a single `business-clients` value.
- Use the icon `Building2` and label "Business Clients".
- Map the new tab to a permission (treat as a single permission for now: keep visible if user has either `individual_owners` OR `rental_shops` permission, or is full/super admin).
- Remove imports of the two old tab components and render the new one.
- Delete `src/components/admin/AdminIndividualOwnersTab.tsx` and `src/components/admin/AdminRentalShopsTab.tsx`.

Employees-tab permission UI (`AdminEmployeesTab.tsx`) keeps the two existing permission keys (`individual_owners`, `rental_shops`) untouched in the database to avoid a migration; the merged tab is shown if either is granted. (Optional cleanup of the permission UI labels can come later.)

## Files

- Edit: `src/pages/AdminPanel.tsx`
- Create: `src/components/admin/AdminBusinessClientsTab.tsx`
- Delete: `src/components/admin/AdminPricingTab.tsx`
- Delete: `src/components/admin/AdminIndividualOwnersTab.tsx`
- Delete: `src/components/admin/AdminRentalShopsTab.tsx`

## Out of scope

- No DB migration. The `business_type` column still distinguishes shops vs individuals; we just stop showing them as separate tabs.
- The `pricing_tiers` table and any non-admin pages that read it stay as-is.
- No changes to the renter "Clients" tab.
