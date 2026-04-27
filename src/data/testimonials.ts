// Renter testimonials data — placeholder content, easy to replace with real
// reviews / images / audio / video later. Set `verified: true` only when the
// testimonial is genuinely verified — the UI will then surface the badge.
//
// Order is intentional: with a 3-column CSS-columns masonry layout, items
// flow top-to-bottom, so positions 1/4/7 land in column 1, 2/5/8 in column 2,
// and 3/6/9 in column 3. We balance each column to contain one video, one
// audio, and one text/portrait card.

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
  // ── Column 1 ──────────────────────────────────────────────────────────
  {
    id: "yassine-casa",
    type: "text",
    name: "Yassine",
    city: "Casablanca",
    rentalType: t("Scooter rental", "Location de scooter", "تأجير سكوتر"),
    tripDetail: t("Casablanca → Mohammedia", "Casablanca → Mohammedia", "الدار البيضاء → المحمدية"),
    rating: 5,
    review: t(
      "I needed a scooter for two days in Casablanca and Motonita made it simple. I compared options, contacted the provider, and booked without wasting time.",
      "J'avais besoin d'un scooter pour deux jours à Casablanca. Motonita m'a permis de comparer rapidement les options et de réserver sans perdre du temps.",
      "كنت بحاجة إلى سكوتر لمدة يومين في الدار البيضاء، وقد سهّلت موتونيتا الأمر كثيراً. قارنت بين الخيارات، تواصلت مع المؤجّر، وأتممت الحجز دون إضاعة الوقت."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=12",
    verified: true,
    date: "2026-03-12",
  },
  // ── Column 2 ──────────────────────────────────────────────────────────
  {
    id: "sara-marrakech-audio",
    type: "audio",
    name: "Sara",
    city: "Marrakech",
    rentalType: t("Weekend ride", "Balade du week-end", "جولة نهاية الأسبوع"),
    review: t(
      "I loved how easy it was to find a scooter near me. It felt faster than calling random rental shops and asking the same questions again and again.",
      "J'ai aimé la simplicité. Trouver un scooter proche de moi était beaucoup plus facile que d'appeler plusieurs agences une par une.",
      "أعجبتني السهولة الكبيرة في إيجاد سكوتر قريب مني. كان الأمر أسرع بكثير من الاتصال بعدّة وكالات وطرح الأسئلة نفسها مراراً وتكراراً."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=47",
    durationSec: 34,
    verified: true,
    rating: 5,
  },
  // ── Column 3 ──────────────────────────────────────────────────────────
  {
    id: "omar-agadir-video",
    type: "video",
    name: "Omar",
    city: "Agadir",
    rentalType: t("Touring motorbike", "Moto de tourisme", "دراجة سياحية"),
    tripDetail: t("Agadir coastal ride", "Balade côtière à Agadir", "جولة ساحلية في أكادير"),
    rating: 5,
    review: t(
      "I wanted a bike for a coastal ride and the experience felt smooth from the first search. Motonita makes renting feel modern.",
      "Je voulais une moto pour une balade sur la côte. L'expérience était fluide dès la première recherche.",
      "أردتُ دراجة لجولة على الساحل، وكانت التجربة سلسة منذ البحث الأول. موتونيتا تمنح التأجير طابعاً عصرياً."
    ),
    imageUrl:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=900&q=70",
    durationSec: 64,
    verified: true,
  },
  // ── Column 1 ──────────────────────────────────────────────────────────
  {
    id: "lina-tangier-video",
    type: "video",
    name: "Lina",
    city: "Tangier",
    rentalType: t("City scooter", "Scooter urbain", "سكوتر داخل المدينة"),
    tripDetail: t("Tangier old town tour", "Visite de la vieille ville de Tanger", "جولة في المدينة القديمة بطنجة"),
    rating: 5,
    review: t(
      "For short trips around the city, this was exactly what I needed. Simple, clear, and much easier than searching everywhere manually.",
      "Pour les petits déplacements en ville, c'était exactement ce qu'il me fallait. Simple, clair et pratique.",
      "بالنسبة إلى التنقلات القصيرة داخل المدينة، كان هذا تماماً ما أحتاج إليه. بسيط وواضح وأسهل بكثير من البحث في كل مكان يدوياً."
    ),
    imageUrl:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=70",
    durationSec: 52,
    verified: true,
  },
  // ── Column 2 ──────────────────────────────────────────────────────────
  {
    id: "amine-rabat",
    type: "text",
    name: "Amine",
    city: "Rabat",
    rentalType: t("Motorbike rental", "Location de moto", "تأجير دراجة نارية"),
    rating: 5,
    review: t(
      "The biggest thing for me was confidence. I could see details, choose what fits my budget, and plan my ride before going.",
      "Ce qui m'a rassuré, c'est la clarté. Je pouvais voir les détails, choisir selon mon budget et mieux préparer mon trajet.",
      "أهمّ ما منحني الثقة هو الوضوح. تمكّنت من رؤية التفاصيل واختيار ما يناسب ميزانيتي والتخطيط لرحلتي قبل الانطلاق."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=33",
    verified: true,
    date: "2026-02-28",
  },
  // ── Column 3 ──────────────────────────────────────────────────────────
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
      "استلمتُ سكوتراً بالقرب من المدينة القديمة وأعدتُه في المساء نفسه. بصراحة، إنها أسهل عملية تأجير قمتُ بها على الإطلاق."
    ),
  },
  // ── Column 1 ──────────────────────────────────────────────────────────
  {
    id: "hicham-fes-audio",
    type: "audio",
    name: "Hicham",
    city: "Fes",
    rentalType: t("Delivery scooter", "Scooter de livraison", "سكوتر التوصيل"),
    rating: 5,
    review: t(
      "I rent a delivery scooter every week through Motonita. The whole process feels organized and the providers respond quickly.",
      "Je loue un scooter de livraison chaque semaine sur Motonita. Tout est organisé et les loueurs répondent rapidement.",
      "أستأجر سكوتر توصيل أسبوعياً عبر موتونيتا. العملية برمّتها منظّمة، والمؤجّرون يستجيبون بسرعة."
    ),
    avatarUrl: "https://i.pravatar.cc/120?img=68",
    durationSec: 28,
    verified: true,
    date: "2026-03-04",
  },
  // ── Column 2 ──────────────────────────────────────────────────────────
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
  // ── Column 3 ──────────────────────────────────────────────────────────
  {
    id: "salma-casa-portrait",
    type: "portrait",
    name: "Salma",
    city: "Casablanca",
    rentalType: t("City scooter", "Scooter urbain", "سكوتر داخل المدينة"),
    rating: 5,
    review: t(
      "Booked in minutes, picked up around the corner. Felt safe and modern.",
      "Réservé en quelques minutes, récupéré au coin de la rue. Sûr et moderne.",
      "أتممتُ الحجز في دقائق، واستلمتُ السكوتر على ناصية الشارع. شعرتُ بالأمان وبأن الخدمة عصرية."
    ),
    imageUrl:
      "https://images.unsplash.com/photo-1517036679160-12f72b22de83?auto=format&fit=crop&w=900&q=70",
    verified: true,
  },
];
