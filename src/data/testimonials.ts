// Renter testimonials data — placeholder content, easy to replace with real
// reviews / images / audio / video later. Set `verified: true` only when the
// testimonial is genuinely verified — the UI will then surface the badge.

export type TestimonialType = "text" | "audio" | "video" | "portrait";

export interface LocalizedText {
  en: string;
  fr: string;
  ar: string;
}

export interface Testimonial {
  id: string;
  type: TestimonialType;
  name: string;
  city: string;
  rentalType: LocalizedText;
  tripDetail?: LocalizedText;
  rating?: 1 | 2 | 3 | 4 | 5;
  review?: LocalizedText;
  avatarUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  durationSec?: number;
  verified: boolean;
  date?: string;
}

const t = (en: string, fr: string, ar: string): LocalizedText => ({ en, fr, ar });

export const testimonials: Testimonial[] = [
  {
    id: "yassine-casa",
    type: "text",
    name: "Yassine",
    city: "Casablanca",
    rentalType: t("Scooter rental", "Location de scooter", "كراء سكوتر"),
    tripDetail: t("Casablanca → Mohammedia", "Casablanca → Mohammedia", "الدار البيضاء → المحمدية"),
    rating: 5,
    review: t(
      "I needed a scooter for two days in Casablanca and Motonita made it simple. I compared options, contacted the provider, and booked without wasting time.",
      "J'avais besoin d'un scooter pour deux jours à Casablanca. Motonita m'a permis de comparer rapidement les options et de réserver sans perdre du temps.",
      "كنت محتاج سكوتر لمدة يومين في الدار البيضاء، وموتونيتا سهّلات عليا نقارن الاختيارات ونحجز بلا ما نضيع الوقت."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=12",
    verified: true,
    date: "2026-03-12",
  },
  {
    id: "sara-marrakech-audio",
    type: "audio",
    name: "Sara",
    city: "Marrakech",
    rentalType: t("Weekend ride", "Balade du week-end", "جولة نهاية الأسبوع"),
    review: t(
      "I loved how easy it was to find a scooter near me. It felt faster than calling random rental shops and asking the same questions again and again.",
      "J'ai aimé la simplicité. Trouver un scooter proche de moi était beaucoup plus facile que d'appeler plusieurs agences une par une.",
      "عجباتني السهولة. لقيت سكوتر قريب مني بسرعة بلا ما نبقى نتاصل بعدة محلات واحد بواحد."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=47",
    durationSec: 34,
    verified: true,
    rating: 5,
    // audioUrl intentionally omitted to demo the graceful "coming soon" state
  },
  {
    id: "amine-rabat",
    type: "text",
    name: "Amine",
    city: "Rabat",
    rentalType: t("Motorbike rental", "Location de moto", "كراء موطو"),
    rating: 5,
    review: t(
      "The biggest thing for me was confidence. I could see details, choose what fits my budget, and plan my ride before going.",
      "Ce qui m'a rassuré, c'est la clarté. Je pouvais voir les détails, choisir selon mon budget et mieux préparer mon trajet.",
      "أكثر حاجة عطلاتني الثقة هي الوضوح. قدرت نشوف التفاصيل، نختار حسب الميزانية، ونوجد الرحلة ديالي براحة."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=33",
    verified: true,
    date: "2026-02-28",
  },
  {
    id: "lina-tangier-portrait",
    type: "portrait",
    name: "Lina",
    city: "Tangier",
    rentalType: t("City scooter", "Scooter urbain", "سكوتر المدينة"),
    rating: 5,
    review: t(
      "For short trips around the city, this was exactly what I needed. Simple, clear, and much easier than searching everywhere manually.",
      "Pour les petits déplacements en ville, c'était exactement ce qu'il me fallait. Simple, clair et pratique.",
      "للتنقلات القصيرة داخل المدينة، كانت تجربة مناسبة بزاف. بسيطة، واضحة، وعملية."
    ),
    imageUrl:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=70",
    verified: true,
  },
  {
    id: "omar-agadir-video",
    type: "video",
    name: "Omar",
    city: "Agadir",
    rentalType: t("Touring motorbike", "Moto de tourisme", "موطو سياحية"),
    tripDetail: t("Agadir coastal ride", "Balade côtière à Agadir", "جولة ساحلية في أكادير"),
    rating: 5,
    review: t(
      "I wanted a bike for a coastal ride and the experience felt smooth from the first search. Motonita makes renting feel modern.",
      "Je voulais une moto pour une balade sur la côte. L'expérience était fluide dès la première recherche.",
      "كنت باغي موتو لجولة على الساحل، والتجربة كانت سلسة من أول بحث."
    ),
    imageUrl:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=900&q=70",
    durationSec: 64,
    verified: true,
    // videoUrl omitted on purpose — demonstrates graceful fallback
  },
  {
    id: "hicham-fes-text",
    type: "text",
    name: "Hicham",
    city: "Fes",
    rentalType: t("Delivery scooter", "Scooter de livraison", "سكوتر التوصيل"),
    rating: 5,
    review: t(
      "I rent a delivery scooter every week through Motonita. The whole process feels organized and the providers respond quickly.",
      "Je loue un scooter de livraison chaque semaine sur Motonita. Tout est organisé et les loueurs répondent rapidement.",
      "كنكري سكوتر التوصيل كل أسبوع من موتونيتا. كلشي منظم والمكترين كيجاوبو بسرعة."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=15",
    verified: true,
    date: "2026-03-04",
  },
  {
    id: "nada-essaouira-audio",
    type: "audio",
    name: "Nada",
    city: "Essaouira",
    rentalType: t("Beach scooter", "Scooter de plage", "سكوتر الشاطئ"),
    avatarUrl: "https://i.pravatar.cc/120?img=49",
    durationSec: 22,
    verified: true,
    rating: 5,
    review: t(
      "Picked up a scooter near the medina, dropped it back the same evening. Honestly the easiest rental I've ever done.",
      "J'ai pris un scooter près de la médina, rendu le soir même. Vraiment la location la plus simple que j'ai faite.",
      "خديت سكوتر حدا المدينة القديمة ورجعتو نفس الليلة. صراحة أسهل كراء دزتو."
    ),
    // audioUrl intentionally omitted
  },
  {
    id: "reda-marrakech-video",
    type: "video",
    name: "Reda",
    city: "Marrakech",
    rentalType: t("Weekend touring", "Tourisme du week-end", "جولة نهاية الأسبوع"),
    tripDetail: t("Marrakech weekend ride", "Balade week-end à Marrakech", "جولة نهاية الأسبوع في مراكش"),
    rating: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1605164599901-db7f68c4b1bb?auto=format&fit=crop&w=900&q=70",
    durationSec: 48,
    verified: true,
  },
  {
    id: "salma-casa-portrait",
    type: "portrait",
    name: "Salma",
    city: "Casablanca",
    rentalType: t("City scooter", "Scooter urbain", "سكوتر المدينة"),
    rating: 5,
    review: t(
      "Booked in minutes, picked up around the corner. Felt safe and modern.",
      "Réservé en quelques minutes, récupéré au coin de la rue. Sûr et moderne.",
      "حجزت فدقائق، خديت السكوتر قريب مني. حسيت بالأمان."
    ),
    imageUrl:
      "https://images.unsplash.com/photo-1517036679160-12f72b22de83?auto=format&fit=crop&w=900&q=70",
    verified: true,
  },
];
