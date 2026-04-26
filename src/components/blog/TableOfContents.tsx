import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Heading {
  id: string;
  text: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function TableOfContents({ containerSelector = "#article-body" }: { containerSelector?: string }) {
  const { t } = useLanguage();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const h2s = Array.from(container.querySelectorAll("h2"));
    const list: Heading[] = h2s.map((h) => {
      if (!h.id) h.id = slugify(h.textContent || "section");
      return { id: h.id, text: h.textContent || "" };
    });
    setHeadings(list);

    if (!list.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    h2s.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [containerSelector]);

  if (!headings.length) return null;

  return (
    <nav aria-label={t("blog.onThisPage")} className="text-sm">
      <h3 className="font-semibold text-[#163300] mb-3">{t("blog.onThisPage")}</h3>
      <ul className="space-y-2 border-l-2 border-[#163300]/10">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`block ps-3 -ms-0.5 border-l-2 -translate-x-px transition-colors ${
                active === h.id
                  ? "border-[#9FE870] text-[#163300] font-medium"
                  : "border-transparent text-muted-foreground hover:text-[#163300]"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
