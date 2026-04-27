## Senior-UX redesign brief — Agency dashboard

Reference: COD Partner-style layout — soft canvas, rounded cards floating on a tinted background, pastel icon tiles, generous breathing room, friendly header.

We keep Motonita's lime (`#9FE870`) brand identity — we are not adopting the violet palette of the reference. We are adopting the *layout language*, *radius scale*, *spacing rhythm*, and *icon-tile pattern*.

## What changes

### 1. Canvas + radius language
Bigger, friendlier radii everywhere. Cards float on a tinted canvas with clear separation.

| Token | Before | After |
|---|---|---|
| `--radius` | 0.75rem (12px) | 1rem (16px) — drives `rounded-lg` |
| Page background | `bg-muted/20` | softer tinted canvas (`hsl(96 25% 97%)` light / unchanged dark) |
| Cards | `rounded-xl` mixed | unified `rounded-2xl` |
| Buttons / pills / inputs | `rounded-md` mixed | `rounded-xl` for primary actions, `rounded-full` for chips |
| Icon tiles | none / `rounded-lg` | `rounded-2xl` soft pastel tiles (44×44) |

### 2. Sidebar — floating, pill nav, pastel icons
- Sidebar becomes a floating panel: `m-3 rounded-2xl border bg-card shadow-sm` (sits on the canvas, no hard right border).
- Width: 240→**256px** expanded, 64→**72px** collapsed.
- Each nav row becomes a **pill** with a **soft pastel icon tile** on the left (the reference's signature).
  - Inactive: `rounded-xl` row, `rounded-xl` muted tile (`bg-muted`), icon at `text-muted-foreground`.
  - Active: `bg-primary/15` pill, icon tile `bg-primary/25`, icon `text-foreground`, no fill hack.
  - Hover: subtle `bg-muted/60` row + tile lifts to `bg-muted`.
- 12px vertical gap between rows (currently 4px).
- Footer profile block: rounded-2xl card with avatar, name, role chip ("Agency"), and a separated "Log out" button — same warmth as the reference's user card.
- Collapse button: pill chip on the **outer edge** of the floating sidebar, half-overlapping (matches the reference's chevron tab).

### 3. Header — calmer, less crowded
- Height stays 64px, but: remove the breadcrumb (it competes with the page H1). Replace with a small **"Hey {name} 👋"** greeting chip on the left (matches the reference) — only on the dashboard; other pages keep page title only.
- Search becomes a **rounded-full** input, 360px wide on lg, with `⌘K` kbd hint.
- Wallet button: rounded-full pill, lime icon tile inside.
- Order: greeting → spacer → search → language → wallet → theme → notifications → help → avatar+name (visible name on desktop, like reference).
- Avatar: 36px rounded-full with role label below (`text-[10px] text-muted-foreground` "Agency").

### 4. Dashboard page — pastel metric cards + softer empty states
- **Metric cards** get the reference's signature pastel icon tile in the top-right corner:
  - Wallet → lime tile (`bg-primary/15`), `Wallet` icon `text-primary`.
  - Pending → amber tile (`bg-warning/15`), `Clock`.
  - This month → blue tile (`bg-info/15`), `Calendar`.
  - Revenue → emerald tile (`bg-success/15`), `TrendingUp`.
  - Card: `rounded-2xl p-6`, label uppercase 11px tracking-wider, value 30px bold, optional delta line below ("+12% vs last month" — only when data available; never fake).
- **Two-column section**: "Today's schedule" (3/5) + "Quick actions" stack (2/5) — keep, but:
  - Quick action tiles get pastel icon tiles too (rounded-2xl, 48×48), label below, hover lifts shadow.
  - Today's schedule: rows get more vertical padding (py-4), avatar+bike thumbnail in rounded-xl, status chip rounded-full.
- **Empty states**: keep the friendly illustration approach from the reference — large soft-tinted circle behind icon, headline + helper copy, primary CTA pill.

### 5. Mobile bottom-nav refinements
- Active tab gets a **lime pill** behind the icon (rounded-2xl), label stays below — matches the modern app feel.
- Bottom nav itself sits inside `mx-3 mb-3 rounded-2xl` floating bar with `shadow-lg` (instead of edge-to-edge).

### 6. Trial / unverified banners
- Switch from edge-to-edge stripes to **rounded-2xl pills** that sit inside the content area (`max-w-7xl mx-auto`), with a leading icon tile. Less alarming, more polished.

## Files touched
- `src/index.css` — `--radius` to 1rem, lighter tinted background variable for agency canvas
- `src/components/agency/Sidebar.tsx` — floating panel, pill nav with icon tiles, profile block
- `src/components/agency/Header.tsx` — greeting chip, rounded-full search/wallet, named avatar
- `src/components/agency/AgencyShell.tsx` — canvas tint, banner pill style, floating-sidebar layout (sidebar margin instead of border-r)
- `src/components/agency/MobileNav.tsx` — floating bottom bar with lime active pill
- `src/pages/agency/Dashboard.tsx` — pastel metric tiles, softer cards, refined quick actions

## Out of scope (explicitly)
- Brand color change — we keep lime. The reference's violet is *not* adopted.
- Page-level features, copy, or data flows — UI only.
- Other agency sub-pages (Bookings, Motorbikes, etc.). They inherit the new tokens automatically (radius, canvas) but no per-page rework in this pass. We can tackle them next once you approve the language here.

## What you'll see after
A calmer, more spacious, more friendly dashboard that feels like a 2026 SaaS tool: floating rounded sidebar, pastel icon tiles everywhere, generous padding, no harsh borders, lime kept as the brand accent.
