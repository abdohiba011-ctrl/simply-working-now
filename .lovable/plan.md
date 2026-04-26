# Replace AI blog images with real stock photos

The current blog hero images in `src/assets/blog-*.jpg` are AI-generated. You want **real photos** from free stock libraries (Pexels / Pixabay) instead.

## What I'll change

### 1. Source real photos from Pexels
Pexels and Pixabay allow free commercial use with no attribution, and Pexels explicitly permits hotlinking from their CDN. I'll pick one real photograph per article:

| Article | Subject |
|---|---|
| How to Rent a Motorbike in Morocco | Real photo: motorbike on an open road |
| Motorbike License Requirements | Real photo: motorcycle helmet + gloves + documents |
| Casablanca Neighborhoods | Real photo: Casablanca cityscape / Hassan II mosque |
| Best Motorbike Routes | Real photo: rider on a winding mountain road |

### 2. Hotlink instead of bundling
I'll use direct Pexels CDN URLs (`images.pexels.com/.../photo.jpeg?auto=compress&cs=tinysrgb&w=1600`) rather than downloading the files. This matches the project memory rule **"Use URL-based image hosting/placeholders (no local static imports)"** and keeps the bundle small.

### 3. Update `src/data/blogPosts.ts`
- Remove the four `import heroX from "@/assets/blog-*.jpg"` lines
- Replace each `heroImage:` field with the corresponding Pexels URL
- Leave titles, excerpts, alt text, and all trilingual content untouched

### 4. Delete the AI-generated files
Remove from `src/assets/`:
- `blog-rent-morocco.jpg`
- `blog-license-morocco.jpg`
- `blog-casablanca.jpg`
- `blog-atlas-routes.jpg`

### 5. Verify
Visit `/blog` and each of the four article pages to confirm the real photos load correctly in EN/FR/AR with proper alt text and no broken images.

## Files touched
- `src/data/blogPosts.ts` — swap imports for Pexels URLs
- `src/assets/blog-*.jpg` (×4) — delete

## Out of scope
- No changes to `BlogCard.tsx`, `BlogPost.tsx`, or any article body content
- No changes to translations, routes, or sitemap
- No changes to other AI-generated assets elsewhere in the project