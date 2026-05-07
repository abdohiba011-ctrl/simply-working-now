## Goal
Stop the homepage from showing skeleton/fade placeholders every time. Images should load immediately, then rely on the browser's HTTP cache so returning users see them instantly without any lazy/skeleton flash.

## Root cause
`src/components/ui/responsive-image.tsx` uses an `IntersectionObserver` + `bg-muted animate-pulse` skeleton + opacity fade-in for every non-priority image. Even cached images briefly render a placeholder. Several homepage `<img>` tags also set `loading="lazy"`, so the browser delays them until scroll.

## Changes

### 1. `src/components/ui/responsive-image.tsx` — load eagerly, no skeleton, no observer
- Remove the `IntersectionObserver` and the `isInView` skeleton branch — always render the `<img>` immediately.
- Remove the opacity fade transition entirely (no `opacity-0` / `transition-opacity`).
- Default `loading` to `"eager"` (still allow `priority` to set `fetchPriority="high"`).
- Keep the `srcSet` / `sizes` / `fallback` / error-handling logic untouched.

Result: the browser fetches images on first visit (and caches them via standard HTTP cache headers); on subsequent visits or in-session navigations they appear instantly with no placeholder.

### 2. Homepage `<img>` tags — drop explicit `loading="lazy"`
Remove `loading="lazy"` from these (let browser default = eager):
- `src/components/HeroSection.tsx` (line 238 — keep `eager` for the first slide, drop the `lazy` for the rest)
- `src/components/TestimonialsSection.tsx` (line 68 — testimonial avatars)

### Out of scope
- Chat thread image attachments (`ChatThread.tsx`, `BookingChat.tsx`) — these aren't on the homepage and lazy is appropriate there.
- Admin fleet thumbnails (`AdminFleetTab.tsx`) — admin-only.
- Route-level `React.lazy()` code-splitting in `App.tsx` — that's JS bundle splitting (not image lazy-loading) and is unrelated to the user's complaint about visual flashes.

## Verification
- First visit to `/`: hero, top cities, testimonials, value props all render together without skeleton pulses or fade-ins.
- Reload the page: same images appear instantly from cache, no flash.
- Mobile viewport: same behavior, no scroll-triggered loading.
