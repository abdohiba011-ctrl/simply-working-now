import type { ArticleContent } from "./how-to-rent-motorbike-morocco";
import article1 from "./how-to-rent-motorbike-morocco";
import article2 from "./motorbike-license-morocco-guide";

const registry: Record<string, ArticleContent> = {
  "how-to-rent-motorbike-morocco": article1,
  "motorbike-license-morocco-guide": article2,
};

export function getArticleContent(slug: string): ArticleContent | undefined {
  return registry[slug];
}
