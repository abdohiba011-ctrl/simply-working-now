import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { enUS, fr as frLocale, arSA } from "date-fns/locale";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogCard } from "@/components/blog/BlogCard";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { NewsletterCta } from "@/components/blog/NewsletterCta";
import { getPostBySlug, getRelatedPosts } from "@/data/blogPosts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { enhanceBodyHtml } from "@/lib/blogInternalLinks";

const SITE = "https://motonita.ma";
const localeMap = { en: enUS, fr: frLocale, ar: arSA } as const;

export default function BlogPost() {
  const { slug = "" } = useParams();
  const { language, t } = useLanguage();
  const post = getPostBySlug(slug);

  const related = useMemo(() => (post ? getRelatedPosts(post.slug, 3) : []), [post]);

  const bodyHtml = useMemo(() => {
    if (!post) return "";
    const raw = post.body?.[language] ?? post.body?.en ?? "";
    if (!raw) return `<p>${t("blog.placeholderBody")}</p>`;
    return enhanceBodyHtml(raw, post.slug, language);
  }, [post, language, t]);

  const wordCount = useMemo(() => {
    const txt = bodyHtml.replace(/<[^>]+>/g, " ").trim();
    return txt ? txt.split(/\s+/).length : 0;
  }, [bodyHtml]);

  useDocumentHead({
    title: post ? `${post.title[language]} | Motonita` : "Motonita Blog",
    description: post?.excerpt[language],
    canonical: post ? `${SITE}/blog/${post.slug}` : `${SITE}/blog`,
    meta: post
      ? [
          { name: "keywords", content: post.keywords.join(", ") },
          { property: "og:type", content: "article" },
          { property: "og:image", content: post.heroImage },
          { property: "og:url", content: `${SITE}/blog/${post.slug}` },
          { property: "article:published_time", content: post.publishedAt },
          { property: "article:section", content: post.category },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: post.heroImage },
        ]
      : [],
    jsonLd: post
      ? [
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title[language],
            description: post.excerpt[language],
            image: post.heroImage,
            author: { "@type": "Organization", name: "Motonita Editorial Team", url: SITE },
            publisher: {
              "@type": "Organization",
              name: "Motonita",
              logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
            },
            datePublished: post.publishedAt,
            dateModified: post.updatedAt ?? post.publishedAt,
            mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${post.slug}` },
            articleSection: post.category,
            wordCount,
            inLanguage: language,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
              { "@type": "ListItem", position: 3, name: post.title[language], item: `${SITE}/blog/${post.slug}` },
            ],
          },
        ]
      : [],
  });

  if (!post) return <Navigate to="/blog" replace />;

  const locale = localeMap[language] ?? enUS;
  const dateText = format(new Date(post.publishedAt), "PPP", { locale });
  const updatedText = post.updatedAt ? format(new Date(post.updatedAt), "PPP", { locale }) : null;
  const minRead = t("blog.minRead").replace("{{count}}", String(post.readingMinutes));
  const url = `${SITE}/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1000px] mx-auto px-6 py-10">
          {/* Breadcrumb + back */}
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
            <Link to="/" className="hover:text-[#163300]">{t("footer.home")}</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <Link to="/blog" className="hover:text-[#163300]">Blog</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-[#163300] line-clamp-1">{post.title[language]}</span>
          </nav>
          <Link to="/blog" className="mt-4 inline-flex items-center gap-2 text-sm text-[#163300] hover:underline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("blog.backToBlog")}
          </Link>
        </div>

        <div className="max-w-[1000px] mx-auto px-6 pb-16 grid lg:grid-cols-[1fr_260px] gap-12">
          <article>
            <span className="inline-block bg-[#9FE870] text-[#163300] rounded-full px-3 py-1 text-xs font-medium">
              {t(`blog.categories.${post.category}`)}
            </span>
            <h1 className="mt-4 text-2xl md:text-4xl font-bold text-[#163300] leading-tight tracking-tight">
              {post.title[language]}
            </h1>
            <div className="mt-4 text-sm text-muted-foreground">
              {t("blog.byEditorial")} · {t("blog.published")} {dateText} · {minRead}
              {updatedText && <span className="block mt-1">{t("blog.updated")}: {updatedText}</span>}
            </div>
            <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <img
                src={post.heroImage}
                alt={post.heroAlt[language]}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            <div
              id="article-body"
              className="prose prose-lg max-w-none mt-10 prose-headings:text-[#163300] prose-h2:mt-12 prose-h2:text-2xl prose-h2:font-bold prose-h3:mt-8 prose-h3:text-xl prose-h3:font-semibold prose-p:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-[#9FE870] prose-blockquote:italic prose-a:text-[#163300] prose-a:underline-offset-4 hover:prose-a:text-[#3a7d00] prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {/* End-of-article footer */}
            <div className="mt-12 border-t border-[#163300]/10 pt-8">
              <div className="flex items-start gap-4 rounded-xl border border-[#163300]/10 p-5 bg-white">
                <div className="w-12 h-12 rounded-full bg-[#163300] text-[#9FE870] flex items-center justify-center font-bold text-lg" aria-hidden="true">M</div>
                <div>
                  <div className="font-semibold text-[#163300]">{t("blog.byEditorial")}</div>
                  <p className="text-sm text-muted-foreground mt-1">{t("blog.editorialBio")}</p>
                </div>
              </div>

              <div className="mt-6">
                <ShareButtons url={url} title={post.title[language]} />
              </div>

              {related.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-[#163300] mb-6">{t("blog.relatedArticles")}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {related.map((r) => (
                      <BlogCard key={r.slug} post={r} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12">
                <NewsletterCta />
              </div>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents />
            </div>
          </aside>
        </div>

        {/* Trust strip */}
        <div className="border-t border-[#163300]/10 bg-muted/30">
          <div className="max-w-[1000px] mx-auto px-6 py-8 text-sm text-muted-foreground">
            {t("blog.trustStrip")} {t("blog.lastReviewed")}: {dateText}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
