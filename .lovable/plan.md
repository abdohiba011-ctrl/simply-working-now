## Goal
Build the blog system **infrastructure only** (Part 1 of 3). Render 4 article cards with metadata + a full article template that displays placeholder body content. Real article copy lands in Parts 2 & 3.

---

## 1. Data layer — `src/data/blogPosts.ts`

Single source of truth for all 4 posts. Typed array; trilingual fields nested.

```ts
export type BlogCategory = "guide" | "legal" | "local" | "routes";
export interface BlogPost {
  slug: string;
  category: BlogCategory;
  heroImage: string;
  heroAlt: { en: string; fr: string; ar: string };
  publishedAt: string;   // ISO
  updatedAt?: string;
  readingMinutes: number;
  title:   { en: string; fr: string; ar: string };
  excerpt: { en: string; fr: string; ar: string };
  keywords: string[];
  // Body left empty for Part 2/3. Renderer shows placeholder.
  body?:  { en?: string; fr?: string; ar?: string };
}
```

Seed exactly the 4 posts from the brief (slugs, titles, excerpts, dates = 2026-04-26, reading times 12/8/10/14, categories Guide/Legal/Local/Routes), with the 4 Unsplash URLs (`?w=1200&q=80&auto=format&fit=crop`).

Helper exports: `getPostBySlug(slug)`, `getRelatedPosts(slug, limit=3)` (same category first, then fill).

---

## 2. Translations — extend `src/locales/{en,fr,ar}.json`

Add a `blog.*` namespace + add the **Blog** quick-link string:

- `footer.blog` → "Blog" / "Blog" / "المدونة"
- `blog.indexTitle`, `blog.indexSubtitle` (trilingual per brief)
- `blog.categories.guide|legal|local|routes`
- `blog.minRead` (e.g. "{{count}} min read" / "min de lecture" / "دقائق قراءة")
- `blog.byEditorial` → "By Motonita Editorial Team" (+ FR/AR)
- `blog.readArticle`, `blog.backToBlog`, `blog.onThisPage`, `blog.relatedArticles`, `blog.share`, `blog.copyLink`, `blog.newsletterTitle`, `blog.newsletterCta`, `blog.placeholderBody` ("Article content will be added in the next deployment phase."), `blog.lastReviewed`, `blog.trustStrip`, `blog.published`, `blog.updated`, `blog.jumpToSection`.

Card titles/excerpts come from the data file (already trilingual), not from i18n JSON.

---

## 3. Footer — `src/components/Footer.tsx`

Insert a new `<li>` for **Blog** between **About Us** and **FAQ** linking to `/blog`, using `t('footer.blog')`. Order: Home → Browse Bikes → About Us → Blog → FAQ.

---

## 4. `/blog` landing page — `src/pages/Blog.tsx`

- Reuses existing `Header` + `Footer`.
- Container `max-w-[1200px] mx-auto px-6 py-16`.
- H1 + subtitle from `blog.indexTitle/Subtitle` (picks current language).
- Reserved spacer `<div className="mb-8" />` where the future category-pill row will go (no pills built — per brief).
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-8`.
- **BlogCard** component (`src/components/blog/BlogCard.tsx`):
  - Wrapped in `<Link to={'/blog/' + slug}>`, `rounded-xl border border-[#163300]/10 bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition duration-200`.
  - 16:9 hero image (`aspect-video object-cover`), `loading="lazy"` (eager only above the fold? we'll use eager for the first card via `priority` prop).
  - Category pill: `bg-[#9FE870] text-[#163300] rounded-full px-3 py-1 text-xs` placed just below the image.
  - Meta row: `8 min read · April 26, 2026` (date formatted via `date-fns/format` localized by current language using `enUS / fr / arSA` locales).
  - H2 `text-xl font-bold text-[#163300] line-clamp-2`.
  - Excerpt `line-clamp-3 text-muted-foreground`.
  - Author row: `By Motonita Editorial Team` (translated).
  - "Read article →" with lime color and arrow icon.
- Add `<Helmet>`-style head via a small inline effect that sets `document.title` + meta description (project doesn't appear to use react-helmet — see SEO approach in Section 7).

---

## 5. `/blog/:slug` detail page — `src/pages/BlogPost.tsx`

- Route param via `useParams()`. If `getPostBySlug` returns nothing → render `<NotFound />` style fallback (or `<Navigate to="/blog" replace />`).
- Layout wrapper: `max-w-[1000px] mx-auto px-6 py-12 grid lg:grid-cols-[1fr_280px] gap-12`.
- **Top bar**:
  - Breadcrumb: Home › Blog › {title} (with proper RTL ordering when `isRTL`).
  - Back button: `← Back to Blog` (flips arrow under RTL).
- **Article header**:
  - Category pill, H1 `text-4xl md:text-2xl-on-mobile font-bold text-[#163300]`.
  - Meta row with author · published · reading time. If `updatedAt`, show "Last updated".
  - Hero `aspect-video w-full rounded-xl mt-8 object-cover` with `loading="eager" fetchpriority="high"`.
- **Article body** (`<article className="prose prose-lg max-w-none">`):
  - For Part 1, render `<p>{t('blog.placeholderBody')}</p>` so the page is testable. The `body` field on each post stays empty.
  - Custom Tailwind prose overrides via `className`: `prose-headings:text-[#163300] prose-h2:mt-12 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-blockquote:border-l-4 prose-blockquote:border-[#9FE870] prose-blockquote:italic prose-a:text-[#163300] hover:prose-a:text-[#9FE870] prose-img:rounded-lg`.
  - Note: project does **not** currently include `@tailwindcss/typography`. We will install it (`bun add -D @tailwindcss/typography`) and register it in `tailwind.config.ts` plugins.
- **Right sidebar — `<TableOfContents />`** (`src/components/blog/TableOfContents.tsx`):
  - Sticky `lg:sticky lg:top-24`. Hidden on mobile; mobile shows a small fixed "Jump to section" button that opens a Sheet.
  - Auto-scans the rendered article container for `<h2>` elements (via `useEffect` + `MutationObserver` + `IntersectionObserver` for active state). Each H2 gets an auto-generated `id` from a slugify helper if missing.
  - Active link highlighted with lime; smooth scroll via `el.scrollIntoView({ behavior: 'smooth' })`.
  - For Part 1 there are no H2s in the placeholder body — the ToC will simply render empty (collapses gracefully). Logic still works for Parts 2/3.
- **End-of-article footer**:
  - Editorial author card (avatar circle with "M" mark, name, short bio in i18n).
  - Share buttons row: Facebook, WhatsApp, X/Twitter, Copy link (uses `navigator.clipboard` + sonner toast).
  - **Related articles**: `getRelatedPosts(slug, 3)` rendered with the same `BlogCard` (compact variant — same component, no flag needed).
  - Newsletter CTA card: simple email `<input>` + button. For Part 1, submit just shows a sonner success toast (no backend wiring; can flip to Lovable Cloud later — out of scope now).
- **Trust strip** above footer: muted text quoting `blog.trustStrip` with `Last reviewed: {date}`.

---

## 6. Internal linking engine — `src/lib/blogInternalLinks.ts`

Pure function `enhanceBodyHtml(html: string, currentSlug: string, lang: Language): string`.

- Keyword map (case-insensitive, whole-word, **first match per article only**, never inside existing `<a>` or heading tags):
  - `Casablanca` → `/rent/casablanca`
  - `Yamaha YBR 125`, `Honda CG 125`, etc. → `/bike/{id}` (mapping table; for Part 1 we wire the function but the placeholder body has no matches, so no-op).
  - `license` / `permis` / `رخصة` → `/blog/motorbike-license-morocco-guide` (skip if currentSlug matches).
  - `neighborhood` / `quartier` / `الأحياء` → `/blog/motorbike-rental-casablanca-neighborhoods` (skip if currentSlug matches).
- Implementation: small DOM walker using `DOMParser` to safely skip `A`/`H1-H6`/`CODE` nodes; replaces only the first text-node match per keyword.
- Will be invoked by the article renderer in Parts 2/3 once real body HTML/MDX exists. For Part 1 it's exported and unit-ready but not visibly active.

---

## 7. SEO — JSON-LD, meta tags, `<title>` per article

Project does not use react-helmet. Add a tiny in-house `useDocumentHead({ title, description, og, jsonLd[] })` hook (`src/hooks/useDocumentHead.ts`) that:

- Sets `document.title`, updates/creates `<meta name="description">`, OG tags, Twitter card, `article:published_time`, `article:section`, `<html lang>` (already handled by LanguageContext — we just confirm).
- Injects `<script type="application/ld+json" data-blog>` blocks into `<head>` and removes them on unmount.

For `/blog/:slug` we emit:
1. **BlogPosting** schema (per brief — uses post metadata, `wordCount` calculated from body length or 0 for Part 1).
2. **BreadcrumbList** schema.
3. **FAQPage** schema only if `post.faq` array is present (Part 1 has none → skip).

For `/blog` landing: title = `Motonita Blog | …`, description = subtitle, plus optional **Blog** schema (`@type: Blog`, `blogPost: [...]`).

---

## 8. Sitemap — `public/sitemap.xml`

There is no existing `public/sitemap.xml`. Create one with:

- `https://motonita.ma/`
- `https://motonita.ma/blog`
- One `<url>` per post: `https://motonita.ma/blog/{slug}` with `<lastmod>2026-04-26</lastmod>` and `<changefreq>monthly</changefreq>`.

Add a hint line in `public/robots.txt`:

```
Sitemap: https://motonita.ma/sitemap.xml
```

(Static for Part 1. Parts 2/3 update `<lastmod>` per article.)

---

## 9. Routing — `src/App.tsx`

Add lazy imports + routes **above** the `*` catch-all:

```tsx
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
…
<Route path="/blog" element={<Blog />} />
<Route path="/blog/:slug" element={<BlogPost />} />
```

Both are public (no `ProtectedRoute`).

---

## 10. New / edited files

**Created**
- `src/data/blogPosts.ts`
- `src/pages/Blog.tsx`
- `src/pages/BlogPost.tsx`
- `src/components/blog/BlogCard.tsx`
- `src/components/blog/TableOfContents.tsx`
- `src/components/blog/ShareButtons.tsx`
- `src/components/blog/NewsletterCta.tsx`
- `src/hooks/useDocumentHead.ts`
- `src/lib/blogInternalLinks.ts`
- `public/sitemap.xml`

**Edited**
- `src/App.tsx` (routes)
- `src/components/Footer.tsx` (Blog link)
- `src/locales/en.json`, `fr.json`, `ar.json` (footer.blog + blog.* keys)
- `tailwind.config.ts` (add `@tailwindcss/typography` plugin)
- `package.json` (`bun add -D @tailwindcss/typography`)
- `public/robots.txt` (Sitemap line)

---

## 11. Responsiveness, RTL, performance

- Cards grid collapses to 1 column < `md`.
- Article layout collapses to single column < `lg`; ToC becomes a bottom-sheet trigger.
- All Arabic text uses logical properties (`ms-`, `me-`, `ps-`, `pe-`); arrows flip via `rtl:rotate-180` on the back button + read-more arrow.
- Hero image on detail page: `loading="eager" fetchpriority="high"`. All other images: `loading="lazy" decoding="async"`.
- Reading time helper kept centralized: `Math.max(1, Math.ceil(words/200))` — used by Parts 2/3.

---

## 12. Out of scope (deferred to Parts 2 & 3)

- Real article body content (MDX or HTML).
- Wiring newsletter signup to backend.
- Category filter pills (space reserved only).
- FAQ schema (will activate when posts add `faq` arrays).
- Bike model → `/bike/{id}` mapping table population (linker is built; mapping starts empty).