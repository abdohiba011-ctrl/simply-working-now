import type { ArticleContent } from "./how-to-rent-motorbike-morocco";
import article1 from "./how-to-rent-motorbike-morocco";
import article2 from "./motorbike-license-morocco-guide";
import article3 from "./motorbike-rental-casablanca-neighborhoods";
import article4 from "./best-motorbike-routes-morocco";

const registry: Record<string, ArticleContent> = {
  "how-to-rent-motorbike-morocco": article1,
  "motorbike-license-morocco-guide": article2,
  "motorbike-rental-casablanca-neighborhoods": article3,
  "best-motorbike-routes-morocco": article4,
};

export function getArticleContent(slug: string): ArticleContent | undefined {
  return registry[slug];
}
