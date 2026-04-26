import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { enUS, fr as frLocale, arSA } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BlogPost } from "@/data/blogPosts";

interface BlogCardProps {
  post: BlogPost;
  priority?: boolean;
}

const localeMap = { en: enUS, fr: frLocale, ar: arSA } as const;

export const BlogCard = memo(({ post, priority = false }: BlogCardProps) => {
  const { language, t } = useLanguage();
  const locale = localeMap[language] ?? enUS;
  const dateText = format(new Date(post.publishedAt), "PPP", { locale });
  const categoryLabel = t(`blog.categories.${post.category}`);
  const minRead = t("blog.minRead").replace("{{count}}", String(post.readingMinutes));

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-xl border border-[#163300]/10 bg-white overflow-hidden transition duration-200 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#9FE870]"
      aria-label={post.title[language]}
    >
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <img
          src={post.heroImage}
          alt={post.heroAlt[language]}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      </div>
      <div className="p-6">
        <span className="inline-block bg-[#9FE870] text-[#163300] rounded-full px-3 py-1 text-xs font-medium">
          {categoryLabel}
        </span>
        <div className="mt-3 text-xs text-muted-foreground">
          {minRead} · {dateText}
        </div>
        <h2 className="mt-2 text-xl font-bold text-[#163300] line-clamp-2 leading-tight">
          {post.title[language]}
        </h2>
        <p className="mt-2 text-base text-muted-foreground line-clamp-3">
          {post.excerpt[language]}
        </p>
        <div className="mt-4 text-sm text-muted-foreground">{t("blog.byEditorial")}</div>
        <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#163300] group-hover:text-[#3a7d00]">
          {t("blog.readArticle")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </div>
      </div>
    </Link>
  );
});

BlogCard.displayName = "BlogCard";
