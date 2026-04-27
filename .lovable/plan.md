## Goal

Rework the **agency** signup/login experience (`/agency/signup`, `/agency/login`) to be a polished split-screen flow inspired by the Nucleus reference, while keeping the existing email + 6-digit OTP auth model. Plus global UI fixes for radios/checkboxes.

## What changes

### 1. Square radios & checkboxes (global)

- `src/components/ui/radio-group.tsx`: replace circular `RadioGroupItem` (`aspect-square ... rounded-full`) with a **rounded square** (`rounded-md`), and swap the inner `Circle` indicator for a `Check` icon (lucide).
- `src/components/ui/checkbox.tsx`: bump corners from `rounded-sm` to `rounded-md` for visual consistency. (Already square, just softer corners.)

This affects everywhere radios/checkboxes are used (forms, filters, etc.) — desired per request.

### 2. New shared `AgencyAuthLayout` (split screen)

Create `src/components/auth/AgencyAuthLayout.tsx`:

```text
┌─────────────────────────┬──────────────────────────┐
│                         │  ← Back to home          │
│   Bike image (cover)    │  [Logo]      [🌐 Lang ▾] │
│                         │                          │
│   Overlay: Motonita     │      <form children>     │
│   tagline / quote       │                          │
└─────────────────────────┴──────────────────────────┘
```

- **Left panel (≥ md)**: full-height image (the yellow R6 bike the user uploaded → copied to `src/assets/auth-agency-bike.jpg`), with a dark gradient overlay and a Motonita quote/tagline at the bottom (forest text on lime accent dot — matches brand). Hidden under md.
- **Right panel**: white/card background, max-width ~480px content column, with a top bar containing:
  - **"← Back to home"** link (`/`) on the left.
  - **Logo** (small).
  - **Language dropdown** that **reuses the exact same `Select` component used in `Header.tsx`** (EN/FR/AR with flags, RTL-aware).
- The renter `AuthLayout` stays as-is. Only agency pages adopt the split layout.

### 3. Agency Signup as a 2-step wizard

Rewrite `src/pages/auth/Signup.tsx` (when `defaultRole === "agency"`) to render inside `AgencyAuthLayout` with a stepper:

**Step indicator** at the top: `(1) Account · (2) Business`

- **Step 1 — Account**
  - Full name
  - Email
  - Phone (Moroccan format, required for agency)
  - Password (with strength meter — already exists)
  - Confirm password
  - "Next" button → validates only step-1 fields via `form.trigger([...])` before advancing.

- **Step 2 — Business**
  - Business / brand name
  - Business type (`Select`)
  - City (`Select` — uses existing `CITIES`)
  - **Neighborhood** (`Select`, dependent on city — populated from existing `moroccoRegions` data in `src/data/moroccoRegions.ts`; falls back to a free-text input if the selected city has no neighborhood list)
  - Accept terms checkbox
  - "Back" + "Create account" buttons

On submit:
- Call existing `signup()` with `role: "agency"`.
- Navigate to `/verify-email?email=...` (already implemented). Copy on that page already says "Confirm your email — enter the 6-digit code we sent".

The renter signup (`/signup`) keeps its current single-page form unchanged.

### 4. Agency Login redesign

Update `src/pages/auth/Login.tsx` to render inside `AgencyAuthLayout` when `context === "agency"`. Functionality unchanged (email + password, lockouts, error hints, forgot password link). Just the new layout + header (back-to-home, language switcher).

Renter login stays in the current `AuthLayout`.

### 5. Translations

Add new i18n keys to `src/locales/{en,fr,ar}.json`:
- `agencyAuth.back_to_home`, `agencyAuth.step1_title`, `agencyAuth.step2_title`, `agencyAuth.next`, `agencyAuth.back`, `agencyAuth.brand_name`, `agencyAuth.neighborhood`, `agencyAuth.tagline` (for the left panel), etc.

## Technical notes

- New asset: copy `user-uploads://237b32550d6e6cbccdd73f6c103544c6.jpg` → `src/assets/auth-agency-bike.jpg`, imported as ES module.
- Reuse the existing `Select` from `@/components/ui/select` for the language dropdown so it visually matches the header.
- Wizard state managed locally (`useState<1 | 2>(1)`), all fields stay in one `react-hook-form` instance — schema unchanged.
- RTL: layout uses logical Tailwind classes (`me-*`, `ms-*`, `text-start`) so the split mirrors correctly when AR is selected.
- No database / auth flow changes — just UI restructure. Email + 6-digit OTP confirmation flow stays exactly as today.

## Files

**Created**
- `src/components/auth/AgencyAuthLayout.tsx`
- `src/assets/auth-agency-bike.jpg` (from upload)

**Modified**
- `src/components/ui/radio-group.tsx` (square + check indicator)
- `src/components/ui/checkbox.tsx` (rounded-md)
- `src/pages/auth/Signup.tsx` (wizard + agency layout switch)
- `src/pages/auth/Login.tsx` (agency layout switch)
- `src/locales/en.json`, `fr.json`, `ar.json` (new keys)

**Untouched**
- Renter `/signup`, `/login`, `AuthLayout`, auth store, Supabase config, email templates.
