export type BlogCategory = "guide" | "legal" | "local" | "routes";

export interface BlogTrilingual {
  en: string;
  fr: string;
  ar: string;
}

export interface BlogPost {
  slug: string;
  category: BlogCategory;
  heroImage: string;
  heroAlt: BlogTrilingual;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  title: BlogTrilingual;
  excerpt: BlogTrilingual;
  keywords: string[];
  body?: Partial<BlogTrilingual>;
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-rent-motorbike-morocco",
    category: "guide",
    heroImage: IMG("photo-1558981806-ec527fa84c39"),
    heroAlt: {
      en: "Motorbike on a Moroccan road",
      fr: "Moto sur une route marocaine",
      ar: "موطور في طريق مغربية",
    },
    publishedAt: "2026-04-26",
    readingMinutes: 12,
    title: {
      en: "How to Rent a Motorbike in Morocco: 2026 Complete Guide",
      fr: "Comment louer une moto au Maroc : guide complet 2026",
      ar: "كيف تكري موطور في المغرب: دليل شامل 2026",
    },
    excerpt: {
      en: "Everything you need to rent a motorbike or scooter in Morocco — license rules, payment options, insurance basics, and step-by-step booking.",
      fr: "Tout ce qu'il faut pour louer une moto ou un scooter au Maroc — permis, paiement, assurance, et étapes de réservation.",
      ar: "كل ما تحتاج معرفته لكراء موطور في المغرب — الرخصة، طرق الدفع، التأمين، وخطوات الحجز.",
    },
    keywords: ["motorbike rental morocco", "scooter rental morocco", "rent motorbike casablanca", "morocco bike hire", "permis moto maroc"],
  },
  {
    slug: "motorbike-license-morocco-guide",
    category: "legal",
    heroImage: IMG("photo-1568772585407-9361f9bf3a87"),
    heroAlt: {
      en: "Motorcycle rider gear and license",
      fr: "Équipement de motard et permis",
      ar: "معدات السائق ورخصة السياقة",
    },
    publishedAt: "2026-04-26",
    readingMinutes: 8,
    title: {
      en: "Motorbike License Requirements in Morocco: Permis A, A1, B & International",
      fr: "Permis moto au Maroc : A, A1, B et permis international",
      ar: "رخصة السياقة للموطور في المغرب: A، A1، B والرخصة الدولية",
    },
    excerpt: {
      en: "Confused about Moroccan motorbike licenses? Learn exactly which license you need for 50cc, 125cc, or larger bikes — plus how foreign licenses work.",
      fr: "Quelle catégorie de permis pour quelle moto ? Découvrez les règles pour 50cc, 125cc et au-delà — et la validité des permis étrangers.",
      ar: "تايخت عليك أي رخصة لازم لك؟ شوف القوانين للسكوتر 50، 125، وأكثر — والرخص الأجنبية.",
    },
    keywords: ["motorbike license morocco", "permis A maroc", "permis A1 maroc", "international driving permit morocco", "scooter license"],
  },
  {
    slug: "motorbike-rental-casablanca-neighborhoods",
    category: "local",
    heroImage: IMG("photo-1539020140153-e479b8c5c1a6"),
    heroAlt: {
      en: "Casablanca cityscape",
      fr: "Vue de Casablanca",
      ar: "منظر الدار البيضاء",
    },
    publishedAt: "2026-04-26",
    readingMinutes: 10,
    title: {
      en: "Where to Rent a Motorbike in Casablanca: Neighborhood Guide",
      fr: "Où louer une moto à Casablanca : guide des quartiers",
      ar: "فين تكري موطور في الدار البيضاء: دليل الأحياء",
    },
    excerpt: {
      en: "Bouskoura, Anfa, Maârif, Aïn Diab — find the best Casablanca neighborhood for picking up your motorbike rental, plus traffic tips for each.",
      fr: "Bouskoura, Anfa, Maârif, Aïn Diab — découvrez les meilleurs quartiers de Casablanca pour récupérer votre moto et nos conseils trafic.",
      ar: "بوسكورة، أنفا، المعاريف، عين الذياب — أحسن الأحياء فالدار البيضاء باش تاخذ موطورك ونصائح ديال السير.",
    },
    keywords: ["rent motorbike casablanca", "casablanca scooter rental", "anfa motorbike", "ain diab scooter", "maarif rental"],
  },
  {
    slug: "best-motorbike-routes-morocco",
    category: "routes",
    heroImage: IMG("photo-1489493585363-d69421e0edd3"),
    heroAlt: {
      en: "Atlas mountain road",
      fr: "Route dans l'Atlas",
      ar: "طريق في جبال الأطلس",
    },
    publishedAt: "2026-04-26",
    readingMinutes: 14,
    title: {
      en: "7 Best Motorbike Routes in Morocco: Atlas, Sahara, Coast & More",
      fr: "Les 7 plus beaux itinéraires moto au Maroc : Atlas, Sahara, côte",
      ar: "أحسن 7 مسارات للموطور في المغرب: الأطلس، الصحراء، والساحل",
    },
    excerpt: {
      en: "From the Tizi n'Tichka pass to the Sahara dunes — discover Morocco's most unforgettable motorbike routes with our complete riding guide.",
      fr: "Du col de Tizi n'Tichka aux dunes du Sahara — découvrez les itinéraires moto incontournables du Maroc.",
      ar: "من تيزي ن تيشكا حتى كثبان الصحراء — اكتشف أحسن مسارات الموطور في المغرب.",
    },
    keywords: ["motorbike routes morocco", "atlas mountains ride", "tizi n tichka", "sahara motorbike", "morocco motorcycle tour"],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(slug);
  if (!current) return blogPosts.slice(0, limit);
  const sameCat = blogPosts.filter((p) => p.slug !== slug && p.category === current.category);
  const others = blogPosts.filter((p) => p.slug !== slug && p.category !== current.category);
  return [...sameCat, ...others].slice(0, limit);
}
