import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogCard } from "@/components/blog/BlogCard";
import { blogPosts } from "@/data/blogPosts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentHead } from "@/hooks/useDocumentHead";

const SITE = "https://motonita.ma";

export default function Blog() {
  const { language, t } = useLanguage();

  useDocumentHead({
    title: `${t("blog.indexTitle")} | Motonita`,
    description: t("blog.indexSubtitle"),
    canonical: `${SITE}/blog`,
    meta: [
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/blog` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Motonita Blog",
        url: `${SITE}/blog`,
        inLanguage: language,
        blogPost: blogPosts.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title[language],
          url: `${SITE}/blog/${p.slug}`,
          datePublished: p.publishedAt,
          image: p.heroImage,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="max-w-[1200px] mx-auto px-6 py-16">
          <header className="mb-10 max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              {t("blog.indexTitle")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              {t("blog.indexSubtitle")}
            </p>
          </header>
          {/* Reserved space for future category filter pills */}
          <div className="mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogPosts.map((p, i) => (
              <BlogCard key={p.slug} post={p} priority={i === 0} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
