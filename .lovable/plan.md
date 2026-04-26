
Build a live, auto-regenerating `sitemap.xml` for motonita.ma backed by a Supabase Edge Function, plus a clean `robots.txt`.

## 1. Edge Function: `generate-sitemap`

Create `supabase/functions/generate-sitemap/index.ts` (public, `verify_jwt = false`).

On every request it queries the database and emits a fresh XML sitemap. Cached for 1 hour at the edge (`Cache-Control: public, max-age=3600`).

**Static URLs always included** (with `lastmod = today`):

| URL | priority | changefreq |
|---|---|---|
| `/` | 1.0 | daily |
| `/blog` | 0.85 | weekly |
| `/blog/how-to-rent-motorbike-morocco` | 0.85 | monthly |
| `/blog/motorbike-license-morocco-guide` | 0.85 | monthly |
| `/blog/motorbike-rental-casablanca-neighborhoods` | 0.85 | monthly |
| `/blog/best-motorbike-routes-morocco` | 0.85 | monthly |
| `/about` | 0.7 | monthly |
| `/contact` | 0.7 | monthly |
| `/agencies` | 0.7 | monthly |
| `/affiliate` | 0.7 | monthly |
| `/become-business` | 0.6 | monthly |
| `/privacy-policy`, `/terms`, `/cookies` | 0.3 | yearly |

**Dynamic URLs from the database:**

- **Cities**: `SELECT name FROM service_cities WHERE is_available = true` → `https://motonita.ma/rent/{slug}` at priority 0.9, changefreq daily. Slugs via the existing `cityToSlug()` map (Marrakech → `marrakech`, El Jadida → `el-jadida`, etc.).
- **Bikes**: `SELECT id, updated_at FROM bike_types WHERE is_approved = true AND business_status = 'active'` → `https://motonita.ma/bike/{id}` at priority 0.8, changefreq weekly, `lastmod = updated_at`.

**Excluded** (per request): all auth routes, `/agency/*`, `/admin/*`, `/profile`, `/booking*`, `/checkout`, `/inbox`, `/notifications`, `/billing`, `/settings`, `/verification`, `/add-bike`, dashboards, `/faq` (no route — homepage section), neighborhood URLs (query-param filters, not real routes — including would create duplicate-content issues).

**Response headers:**
```
Content-Type: application/xml; charset=utf-8
Cache-Control: public, max-age=3600, s-maxage=3600
```

CORS handled via `corsHeaders` on OPTIONS preflight. No JWT validation (public). No input/rate limiting needed (GET-only, cached).

## 2. Public sitemap URL: `https://motonita.ma/sitemap.xml`

The edge function lives at `https://impgemzhqvbxitsxxczm.supabase.co/functions/v1/generate-sitemap`. Two parts:

- **Update `public/robots.txt`** to point `Sitemap:` directly at the edge function URL. Google, Bing, and all major crawlers accept cross-origin sitemap URLs declared in robots.txt — this is the standard SPA pattern.
- **Replace `public/sitemap.xml`** with a minimal static fallback listing always-known URLs (homepage, 16 cities, 4 blog posts, static pages). Guarantees something exists at `motonita.ma/sitemap.xml` even though robots.txt directs crawlers to the live one.

## 3. Updated `public/robots.txt`

```
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /agency/
Disallow: /profile
Disallow: /settings
Disallow: /checkout
Disallow: /booking-review
Disallow: /payment-status
Disallow: /pay/
Disallow: /confirmation
Disallow: /inbox
Disallow: /notifications
Disallow: /billing
Disallow: /verification
Disallow: /add-bike
Disallow: /all-bookings
Disallow: /booking-history
Disallow: /booking/
Disallow: /change-password
Disallow: /reset-password/
Disallow: /forgot-password
Disallow: /verify-email
Disallow: /login
Disallow: /signup
Disallow: /auth

Sitemap: https://impgemzhqvbxitsxxczm.supabase.co/functions/v1/generate-sitemap
Sitemap: https://motonita.ma/sitemap.xml
```

## 4. Auto-regeneration

Because the edge function queries live on each request:

- **New bike approved** → appears on next crawl (within 1h cache window)
- **New city goes live** → appears within 1h
- **Blog posts** → static list in the edge function; adding a new post requires editing it (mirrors `src/data/blog-content/index.ts`)
- **Agency approval** → no public agency profile pages currently; n/a

## 5. Files to create/edit

| File | Action |
|---|---|
| `supabase/functions/generate-sitemap/index.ts` | Create (edge function) |
| `public/robots.txt` | Replace |
| `public/sitemap.xml` | Replace with static fallback |

## 6. Verification after deploy

- `curl` the function URL → valid XML with bikes + cities
- `curl -I` shows `Content-Type: application/xml`
- Validate against sitemaps.org schema
- Spot-check homepage, one city, one bike, one blog URL

## Out of scope (per your answers)

- Individual neighborhood URLs
- `/faq` route
- Per-bike SEO slugs (currently UUID-only; possible follow-up)
