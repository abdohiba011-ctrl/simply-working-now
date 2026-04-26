import type { Language } from "@/contexts/LanguageContext";

interface LinkRule {
  pattern: RegExp;
  url: string;
  skipIfSlug?: string;
}

const baseRules: LinkRule[] = [
  { pattern: /\bCasablanca\b/i, url: "/rent/casablanca" },
  { pattern: /\b(license|permis|رخصة)\b/i, url: "/blog/motorbike-license-morocco-guide", skipIfSlug: "motorbike-license-morocco-guide" },
  { pattern: /\b(neighborhood|quartier|الأحياء)\b/i, url: "/blog/motorbike-rental-casablanca-neighborhoods", skipIfSlug: "motorbike-rental-casablanca-neighborhoods" },
];

const SKIP_TAGS = new Set(["A", "H1", "H2", "H3", "H4", "H5", "H6", "CODE", "PRE"]);

export function enhanceBodyHtml(html: string, currentSlug: string, _lang: Language = "en"): string {
  if (!html || typeof window === "undefined") return html;
  try {
    const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
    const root = doc.getElementById("root");
    if (!root) return html;

    const rules = baseRules.filter((r) => r.skipIfSlug !== currentSlug);
    const used = new Set<RegExp>();

    const walk = (node: Node) => {
      if (used.size === rules.length) return;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (SKIP_TAGS.has(el.tagName)) return;
        Array.from(el.childNodes).forEach(walk);
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        for (const rule of rules) {
          if (used.has(rule.pattern)) continue;
          const m = rule.pattern.exec(node.textContent);
          if (!m) continue;
          const before = node.textContent.slice(0, m.index);
          const match = m[0];
          const after = node.textContent.slice(m.index + match.length);
          const a = doc.createElement("a");
          a.href = rule.url;
          a.textContent = match;
          const parent = node.parentNode!;
          if (before) parent.insertBefore(doc.createTextNode(before), node);
          parent.insertBefore(a, node);
          if (after) parent.insertBefore(doc.createTextNode(after), node);
          parent.removeChild(node);
          used.add(rule.pattern);
          return;
        }
      }
    };

    Array.from(root.childNodes).forEach(walk);
    return root.innerHTML;
  } catch {
    return html;
  }
}
