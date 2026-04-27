# Plan — Renter testimonials section on Motonita.ma homepage

## Where it goes

Insert a new `TestimonialsSection` in `src/pages/Index.tsx` directly after `CitiesAvailableSection` (the "We reach you everywhere!" map). All other sections (`HeroSection`, `TopCitiesSection`, `HowItWorksSection`, `FAQSection`, `CitiesAvailableSection`, `Footer`) stay exactly as they are. The unused `src/components/ReviewsSection.tsx` is left untouched.

## Files to create / change

- Create `src/components/TestimonialsSection.tsx` — main section component
- Create `src/components/testimonials/TestimonialCard.tsx` — text card
- Create `src/components/testimonials/AudioTestimonialCard.tsx` — audio card with play/pause + fake waveform
- Create `src/components/testimonials/VideoTestimonialCard.tsx` — portrait reel card with play overlay
- Create `src/components/testimonials/PortraitTestimonialCard.tsx` — large image/lifestyle card
- Create `src/components/testimonials/VideoLightbox.tsx` — accessible modal video player
- Create `src/data/testimonials.ts` — typed placeholder data (easy to edit later)
- Edit `src/pages/Index.tsx` — import and render the new section after the map
- Edit `src/locales/en.json`, `fr.json`, `ar.json` — add a `testimonials.*` namespace (headline, subheadline, trust badge, tab labels, CTA, a11y labels, "Verified renter", "Audio testimonial coming soon", "Find a motorbike", "How Motonita works")

## Component design

### Section structure (semantic HTML)

```text
<section aria-labelledby="testimonials-heading">
  <header>
    <span> trust badge </span>
    <h2 id="testimonials-heading"> Real stories from Motonita riders </h2>
    <p> subheadline </p>
    <div role="tablist"> All · Text · Audio · Video </div>
  </header>
  <div role="list"> masonry of cards </div>
  <div> final CTA block </div>
</section>
```

- Wrap in `content-visibility-auto` like other below-fold sections.
- `dir` handling comes from `useLanguage().isRTL` — use logical Tailwind utilities (`ms-*`, `me-*`, `text-start`, `text-end`) and flip the masonry order naturally via grid (no manual reverse needed).

### Masonry grid

- Desktop (`lg:`): CSS columns `lg:columns-3 gap-6` so cards fall into a true masonry, breaking inside avoided with `break-inside-avoid`. This stays asymmetric and natural — no JS layout lib needed.
- Tablet (`md:`): `md:columns-2`.
- Mobile: single stacked column, comfortable tap targets, swipe-friendly natural scroll.

### Card visuals (Motonita brand)

- White/`bg-card` cards, `rounded-2xl`, `border border-border`, `shadow-sm` → `hover:shadow-md`, generous padding, no gradients.
- Accent: orange (`#F97316` / `bg-orange-500`) for play buttons and waveform highlight, primary lime kept for the CTA button per existing brand. We'll add a small `--accent-orange` token in the section only (utility classes), not a global theme change.
- Star rating uses `lucide-react` `Star` filled in amber.
- "Verified renter" pill: small uppercase tracking-wide chip with check icon.
- Trip detail (e.g. "Casablanca → Mohammedia") shown as a subtle muted line under the name/city.

### Card types

1. **Text card** — avatar, name + city, rating, short review, rental type chip, verified pill.
2. **Audio card** — circular orange play/pause button, faux waveform built from 28 vertical bars (animated when playing, static gray when idle), duration label, name + city, small avatar. Real `<audio>` element used when `audioUrl` exists; if missing → disabled button + label "Audio testimonial coming soon" (i18n).
3. **Video card** — portrait aspect (3:4), thumbnail image with `loading="lazy"`, large orange circular play overlay, duration badge bottom-left. Click opens `VideoLightbox`. If `videoUrl` missing → button disabled, overlay shows a soft "Video coming soon" caption, no crash.
4. **Portrait card** — large lifestyle photo (renter with scooter / Moroccan street). Caption row at bottom with name, city, small star line. Uses Moroccan-relevant Unsplash placeholders (Casablanca/Marrakech streets, helmets, scooters) — no Gulf attire.

### Video lightbox

- Portal-less Radix-style dialog using existing shadcn `Dialog` from `src/components/ui/dialog`.
- Closes on ESC, overlay click, and explicit close button (aria-label).
- On close: pauses video and resets `currentTime` to 0.
- Audio cards similarly pause on unmount or when another audio starts (simple shared `useRef` via a tiny module-level controller in `AudioTestimonialCard`).

### Filter tabs

- Tabs: All / Text / Audio / Video. Implemented with the existing shadcn `Tabs` primitive for accessibility (keyboard arrows, `role="tablist"`).
- Filtering is client-side over the `testimonials` array by `type`.
- Language filter is **not** a separate tab — content automatically renders the localized strings for the active app language (EN/FR/AR), reusing `useLanguage()`.

### Final CTA

- Centered card below the grid: headline, supporting text, two buttons:
  - Primary (lime, existing brand button) → links to `/listings`
  - Secondary (outline) → links to `/#how-it-works` (anchor near `HowItWorksSection`)

## Data shape (`src/data/testimonials.ts`)

```ts
export type TestimonialType = "text" | "audio" | "video" | "portrait";

export interface LocalizedText { en: string; fr: string; ar: string; }

export interface Testimonial {
  id: string;
  type: TestimonialType;
  name: string;                // not translated
  city: string;                // displayed as-is, key into i18n if needed later
  rentalType: LocalizedText;   // "Scooter rental" / "Location de scooter" / "كراء سكوتر"
  tripDetail?: LocalizedText;  // optional "Casablanca → Mohammedia"
  rating?: 1|2|3|4|5;
  review?: LocalizedText;      // text/portrait/audio caption
  avatarUrl?: string;
  imageUrl?: string;           // portrait/video thumbnail
  audioUrl?: string;           // optional — UI degrades gracefully
  videoUrl?: string;           // optional — UI degrades gracefully
  durationSec?: number;        // for audio/video badge
  verified: boolean;           // user-controlled flag, default true for placeholders shown as "Verified renter" badge only
  date?: string;               // ISO string optional
}
```

Seed with the 5 EN/FR/AR testimonials from the brief, plus 4 extra placeholder cards (2 audio, 2 video, 1 portrait) so the masonry feels full and matches the reference layout (≈9 cards). Names are Moroccan: Yassine, Sara, Amine, Lina, Omar, Hicham, Nada, Reda, Salma. Cities pulled from the platform's coverage list (Casablanca, Marrakech, Rabat, Tangier, Agadir, Fes, Essaouira).

## i18n keys to add (in all three locale files)

```text
testimonials.trustBadge          "Trusted by riders across Morocco"
testimonials.title               "Real stories from Motonita riders"
testimonials.subtitle            "See why renters across Morocco trust Motonita..."
testimonials.tabs.all            "All"
testimonials.tabs.text           "Text"
testimonials.tabs.audio          "Audio"
testimonials.tabs.video          "Video"
testimonials.verified            "Verified renter"
testimonials.audioComingSoon     "Audio testimonial coming soon"
testimonials.videoComingSoon     "Video coming soon"
testimonials.playAudio           "Play audio testimonial"
testimonials.pauseAudio          "Pause audio testimonial"
testimonials.playVideo           "Play video testimonial"
testimonials.closeVideo          "Close video"
testimonials.cta.title           "Ready to find your next ride?"
testimonials.cta.text            "Explore available motorbikes and scooters near you and book with confidence."
testimonials.cta.primary         "Find a motorbike"
testimonials.cta.secondary       "How Motonita works"
```

Each key gets the FR + AR translations from the brief (and matching translations for the new ones).

## Accessibility & SEO

- `<section>` with `aria-labelledby`, single `<h2>` for the section, `<h3>` per card name to keep hierarchy clean (or visually-hidden h3 if it hurts design).
- All buttons (`Play`, `Pause`, `Close`, tabs) get explicit `aria-label`s pulled from i18n.
- Images: descriptive `alt` text including name + city + "Motonita renter".
- All `<img>` and `<video poster>` use `loading="lazy"` and `decoding="async"`.
- **No JSON-LD `Review` schema is emitted** because the data is placeholder. The `Testimonial.verified` flag is wired so that — once real data is added — schema injection can be enabled later. (Out of scope for now per the brief.)
- Content rendered in real DOM (not canvas) so it stays crawlable.

## Performance

- Section sits inside a `content-visibility-auto` wrapper like the others.
- Audio elements use `preload="none"`; video elements only mount inside the open lightbox.
- Thumbnails use Unsplash with explicit `w=` query params + `loading="lazy"`.

## RTL behavior

- Logical utilities throughout (`ms-`, `me-`, `text-start`).
- Card directional arrows in trip detail render `→` for LTR and `←` for RTL via `isRTL`.
- Waveform direction unchanged (symmetric), play button icon stays the same.
- Tabs and CTA buttons reorder naturally via flex/grid in RTL.

## What this plan deliberately does NOT do

- Does not change the existing map / cities section, header, footer, or any other section.
- Does not modify the global theme or add new shadcn components.
- Does not add fake `Review` structured data.
- Does not add agency/provider testimonials — renters only.
- Does not introduce a backend table; all data lives in the typed local file, ready to be swapped for a Supabase fetch later.
