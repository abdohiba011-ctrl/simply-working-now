
## Problem confirmed

I inspected the live site (`motonita.ma`). Every hashed Vite asset (city images, logos, JS, CSS) is being served with **no `Cache-Control` header**. Example response for `/assets/city-fes-B3ZXorls.avif`:

```
content-type: image/avif
etag: "eccad961ca0168cdaf051a7b0ae18196"
content-length: 44821
(no cache-control header)
```

Without a `Cache-Control` header, the browser revalidates each file on every visit — that's exactly why you see images "lazy loading again" each time. They should be cached for a year because the filename already contains a content hash (`-B3ZXorls`).

A second amplifier: our React `ResponsiveImage` / `OptimizedImage` components always start with `opacity: 0` and an `animate-pulse` skeleton until the `onLoad` event fires. Even when an image is in the disk cache, the skeleton flashes for ~50–100 ms, which makes the page *look* like everything is reloading from scratch.

## Fix plan

**1. Force long-lived caching for hashed assets and city/bike images**

- Add a `public/_headers` file (Lovable + Cloudflare honor it) with:
  - `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`
  - `/*.svg`, `/*.avif`, `/*.webp`, `/*.jpg`, `/*.png` → `Cache-Control: public, max-age=31536000, immutable`
  - `/` and `/index.html` → keep `no-cache` (so deploys go live instantly)
- Increase the upload `cacheControl` in `src/lib/imageUpload.ts` from `'3600'` (1 hour) to `'31536000'` (1 year) so user-uploaded bike images on Supabase Storage are also cached long-term.

**2. Stop the "fade-in flash" when the image is already cached**

Update `src/components/ui/responsive-image.tsx` and `src/components/ui/optimized-image.tsx`:
- On mount, set `isLoaded = true` immediately if `imgRef.current.complete` (image is in browser cache → no fade-in needed).
- For `priority` images, render the `<img>` synchronously without the `opacity-0 → opacity-100` transition.
- Keep IntersectionObserver lazy-loading only for images that are **not in viewport AND not already cached**.

**3. Preload the homepage hero/city images on first paint**

- In `index.html`, add `<link rel="preload" as="image" href="/assets/...">` for the first hero city image (use Vite's `?url` import in `HeroSection` to inject preload hints at runtime via `react-helmet`-style `<link rel="preload">` for the *current* rotating city).
- Already-imported city images are bundled and hashed — once cached, they will not be refetched.

**4. Persist remembered images via the HTTP cache (no localStorage hack)**

The right answer for "do not reload images on the same browser/IP" is HTTP caching, not custom storage. Steps 1–3 achieve this. We will NOT base64-stuff images into localStorage (would explode quotas).

**5. Verify after deploy**

- Re-run a request against `motonita.ma/assets/<hashed>.avif` and confirm the response now contains `cache-control: public, max-age=31536000, immutable`.
- Reload the homepage twice and verify in DevTools Network tab that images come from `(disk cache)` on the second visit instead of refetching.

## Files I will touch

- `public/_headers` (new) — CDN cache headers for static assets.
- `src/lib/imageUpload.ts` — bump Supabase Storage `cacheControl` to 1 year.
- `src/components/ui/responsive-image.tsx` — instant-show when image is already cached, remove fade-flash for priority images.
- `src/components/ui/optimized-image.tsx` — same fix.
- `index.html` — add preload hints for the first hero image.

## What I will NOT do

- No service worker / PWA install — overkill for this issue and adds maintenance.
- No changes to the database schema.
- No new dependencies.

After this, returning visitors on the same browser will see images load from disk cache instantly (no skeleton, no spinner), exactly as you described.
