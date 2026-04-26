import { useEffect } from "react";

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

interface DocumentHeadOptions {
  title?: string;
  description?: string;
  meta?: MetaTag[];
  jsonLd?: Record<string, unknown>[];
  canonical?: string;
}

const MARKER = "data-blog-head";

export function useDocumentHead({ title, description, meta = [], jsonLd = [], canonical }: DocumentHeadOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    const created: HTMLElement[] = [];

    const upsertMeta = (key: "name" | "property", val: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${val}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(key, val);
        el.setAttribute(MARKER, "1");
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute("content", content);
    };

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
    }
    if (title) {
      upsertMeta("property", "og:title", title);
    }

    meta.forEach((m) => {
      if (m.name) upsertMeta("name", m.name, m.content);
      if (m.property) upsertMeta("property", m.property, m.content);
    });

    let canonicalEl: HTMLLinkElement | null = null;
    if (canonical) {
      canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.setAttribute("rel", "canonical");
        canonicalEl.setAttribute(MARKER, "1");
        document.head.appendChild(canonicalEl);
        created.push(canonicalEl);
      }
      canonicalEl.setAttribute("href", canonical);
    }

    const scripts: HTMLScriptElement[] = [];
    jsonLd.forEach((data) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute(MARKER, "1");
      s.text = JSON.stringify(data);
      document.head.appendChild(s);
      scripts.push(s);
    });

    return () => {
      document.title = previousTitle;
      created.forEach((el) => el.remove());
      scripts.forEach((s) => s.remove());
    };
  }, [title, description, JSON.stringify(meta), JSON.stringify(jsonLd), canonical]);
}
