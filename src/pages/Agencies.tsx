import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Building2,
  Check,
  X,
  LayoutDashboard,
  Bike,
  Wallet,
  MessageCircle,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Calendar,
  Bell,
  Lock,
  ArrowRight,
  Star,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const LIME = "#9FE870";
const FOREST = "#163300";

// Local i18n strings — kept in-component to avoid bloating shared locale files.
type Lang = "en" | "fr" | "ar";
const COPY: Record<Lang, any> = {
  en: {
    pill: "FOR RENTAL AGENCIES",
    h1: "Grow your rental business with Motonita",
    sub: "Flat 50 MAD per confirmed booking. 0% commission on your rental price. Keep 100% of what you earn.",
    ctaTrial: "Start 30-day free trial",
    ctaLogin: "Log in to dashboard",
    trust: "Verified agencies · Booked in 60 seconds · Cash Plus accepted",
    compareTitle: "Why agencies switch to Motonita",
    foreignApps: "Foreign rental apps",
    motonita: "Motonita",
    rows: [
      ["Commission per booking", "15–25% of rental price", "0% commission"],
      ["Booking fee", "Hidden, variable", "Flat 50 MAD per confirmed booking"],
      ["Payouts", "Held 7–14 days", "You get paid directly, off-platform"],
      ["Local support", "English-only ticket queue", "Arabic, French, English"],
      ["Local payment", "Card only", "Card + Cash Plus"],
      ["Setup", "Account approval can take weeks", "Verified in days"],
    ],
    exampleTitle: "Example: a 3-day rental at 400 MAD/day (1,200 MAD)",
    foreignKeeps: "Foreign app: you keep ~960 MAD",
    motonitaKeeps: "Motonita: you keep 1,150 MAD",
    featuresTitle: "Everything you need to run your fleet",
    features: [
      ["Smart Dashboard", "One screen for bookings, calendar, fleet and revenue."],
      ["Unlimited Listings", "Pro and Business plans list as many bikes as you have."],
      ["Direct Payments", "Renter pays you directly. No 7-day holds."],
      ["Customer Chat", "Talk to renters in-app once they confirm a booking."],
      ["Analytics", "Track conversion, occupancy and top-performing bikes."],
      ["Verification", "Verified-agency badge boosts trust and bookings."],
    ],
    howTitle: "How it works",
    steps: [
      ["Sign up", "Create your agency in under 2 minutes."],
      ["Add bikes", "Upload photos, set prices, you're live."],
      ["Get bookings", "Renters book and pay the 10 MAD platform fee."],
      ["Confirm & earn", "We deduct 50 MAD from your wallet, you keep the rental."],
    ],
    pricingTitle: "Simple pricing. No surprises.",
    monthly: "Monthly",
    yearly: "Yearly (save 20%)",
    perMonth: "/month",
    perYear: "/year",
    mostPopular: "Most Popular",
    plans: [
      {
        name: "Free",
        priceM: 0,
        priceY: 0,
        tagline: "Test the waters",
        features: ["Listed in search", "Up to 3 bikes", "Basic dashboard", "In-app chat"],
        cta: "Get started free",
      },
      {
        name: "Pro",
        priceM: 99,
        priceY: 950,
        tagline: "For growing agencies",
        features: [
          "Everything in Free",
          "Unlimited bikes",
          "Featured placement",
          "Analytics dashboard",
          "Priority support",
        ],
        cta: "Start 30-day free trial",
        highlight: true,
      },
      {
        name: "Business",
        priceM: 299,
        priceY: 2870,
        tagline: "Multi-location fleets",
        features: [
          "Everything in Pro",
          "Multi-location",
          "API access",
          "Dedicated account manager",
          "Custom contracts",
        ],
        cta: "Contact sales",
      },
    ],
    trialTitle: "How the free trial works",
    trialCards: [
      ["Day 1", "Sign up — full Pro features unlocked instantly. No credit card."],
      ["Days 1–30", "List unlimited bikes. Take real bookings. Test everything."],
      ["Day 25", "We send a friendly reminder so you can choose a plan."],
      ["Day 30", "Trial ends. Pick Pro, Business, or downgrade to Free."],
    ],
    trialWarn:
      "If you don't choose by day 33 (3-day grace), your listings go offline until you upgrade or stay on Free.",
    faqTitle: "Agency questions, answered",
    faqs: [
      ["What does Motonita actually charge me?", "A flat 50 MAD per confirmed booking, deducted from your wallet. That's it. No commission on rental price. Renters pay a separate 10 MAD platform fee themselves."],
      ["Do I need a credit card for the trial?", "No. You start your 30-day Pro trial just by signing up — no card required."],
      ["What happens after my trial ends?", "You get a 3-day grace period. After that, if you haven't picked a paid plan, your listings are hidden from public search until you upgrade. Your bookings and data stay safe."],
      ["Can I downgrade to Free?", "Yes, anytime. Free plan keeps you listed with up to 3 bikes."],
      ["How do I get paid?", "The renter pays you directly at pickup — cash, card, whatever you accept. Motonita never holds your rental money."],
      ["What's the platform fee for renters?", "Renters pay a flat 10 MAD when they book. That's the only thing Motonita charges them."],
      ["How fast does verification take?", "Most agencies are verified within 24–48 hours after submitting documents."],
      ["Can I list scooters and motorbikes?", "Yes. Any two-wheeler — scooters, motorbikes, big trail bikes."],
      ["What if a renter cancels?", "Cancellation rules follow our Terms. The 50 MAD agency fee is only deducted when YOU confirm a booking."],
      ["Do I need to be in Casablanca?", "No. We cover 16 cities across Morocco including Marrakech, Rabat, Tangier, Agadir, Fes and more."],
    ],
    socialTitle: "Launch partners growing with us",
    socialSub: "We're early. These are real agencies on the platform today.",
    finalH1: "Ready to grow your rental business?",
    finalSub: "Start your 30-day Pro trial today. No card. No commitment.",
    contact: "Questions? Email contact@motonita.ma",
  },
  fr: {
    pill: "POUR LES AGENCES DE LOCATION",
    h1: "Développez votre agence avec Motonita",
    sub: "50 MAD forfaitaires par réservation confirmée. 0% de commission sur vos locations. Vous gardez 100% de vos revenus.",
    ctaTrial: "Démarrer l'essai gratuit 30 jours",
    ctaLogin: "Se connecter au tableau de bord",
    trust: "Agences vérifiées · Réservé en 60 secondes · Cash Plus accepté",
    compareTitle: "Pourquoi les agences passent à Motonita",
    foreignApps: "Apps de location étrangères",
    motonita: "Motonita",
    rows: [
      ["Commission par réservation", "15–25% du prix de location", "0% de commission"],
      ["Frais de réservation", "Cachés, variables", "50 MAD forfaitaires par réservation confirmée"],
      ["Paiements", "Retenus 7–14 jours", "Vous êtes payé directement, hors plateforme"],
      ["Support local", "Tickets en anglais uniquement", "Arabe, français, anglais"],
      ["Paiement local", "Carte uniquement", "Carte + Cash Plus"],
      ["Mise en route", "Approbation en plusieurs semaines", "Vérifié en quelques jours"],
    ],
    exampleTitle: "Exemple : location de 3 jours à 400 MAD/jour (1 200 MAD)",
    foreignKeeps: "App étrangère : vous gardez ~960 MAD",
    motonitaKeeps: "Motonita : vous gardez 1 150 MAD",
    featuresTitle: "Tout ce qu'il faut pour gérer votre flotte",
    features: [
      ["Tableau de bord intelligent", "Réservations, calendrier, flotte et revenus en un seul écran."],
      ["Annonces illimitées", "Les plans Pro et Business listent autant de motos que vous voulez."],
      ["Paiements directs", "Le client vous paye directement. Pas de blocage 7 jours."],
      ["Chat client", "Discutez avec les clients dans l'app une fois la réservation confirmée."],
      ["Analytique", "Suivez la conversion, l'occupation et vos meilleures motos."],
      ["Vérification", "Le badge agence vérifiée booste la confiance et les réservations."],
    ],
    howTitle: "Comment ça marche",
    steps: [
      ["Inscription", "Créez votre agence en moins de 2 minutes."],
      ["Ajoutez des motos", "Photos, prix, vous êtes en ligne."],
      ["Recevez des réservations", "Les clients réservent et payent les 10 MAD de frais."],
      ["Confirmez & gagnez", "On déduit 50 MAD de votre portefeuille, vous gardez la location."],
    ],
    pricingTitle: "Tarifs simples. Sans surprise.",
    monthly: "Mensuel",
    yearly: "Annuel (économisez 20%)",
    perMonth: "/mois",
    perYear: "/an",
    mostPopular: "Le plus populaire",
    plans: [
      { name: "Gratuit", priceM: 0, priceY: 0, tagline: "Pour tester", features: ["Listé dans la recherche", "Jusqu'à 3 motos", "Tableau de bord basique", "Chat in-app"], cta: "Commencer gratuitement" },
      { name: "Pro", priceM: 99, priceY: 950, tagline: "Pour les agences en croissance", features: ["Tout du plan Gratuit", "Motos illimitées", "Mise en avant", "Tableau analytique", "Support prioritaire"], cta: "Démarrer l'essai 30 jours", highlight: true },
      { name: "Business", priceM: 299, priceY: 2870, tagline: "Flottes multi-sites", features: ["Tout du plan Pro", "Multi-sites", "Accès API", "Account manager dédié", "Contrats personnalisés"], cta: "Nous contacter" },
    ],
    trialTitle: "Comment fonctionne l'essai",
    trialCards: [
      ["Jour 1", "Inscription — Pro débloqué instantanément. Sans carte bancaire."],
      ["Jours 1–30", "Listez sans limite. Prenez de vraies réservations."],
      ["Jour 25", "Rappel sympa pour choisir votre plan."],
      ["Jour 30", "Fin de l'essai. Choisissez Pro, Business ou Gratuit."],
    ],
    trialWarn: "Sans choix d'ici le jour 33 (3 jours de grâce), vos annonces sont masquées jusqu'au passage à un plan payant ou Gratuit.",
    faqTitle: "Questions des agences",
    faqs: [
      ["Combien Motonita me facture vraiment ?", "50 MAD forfaitaires par réservation confirmée, prélevés du portefeuille. Aucune commission. Le client paye 10 MAD de frais à part."],
      ["Faut-il une carte bancaire pour l'essai ?", "Non. L'essai Pro de 30 jours démarre dès l'inscription, sans carte."],
      ["Que se passe-t-il après l'essai ?", "Vous avez 3 jours de grâce. Sans plan choisi, vos annonces sont masquées. Vos données restent intactes."],
      ["Puis-je passer en Gratuit ?", "Oui, à tout moment. Le Gratuit garde 3 motos listées."],
      ["Comment suis-je payé ?", "Le client vous paye directement à la prise — cash, carte, ce que vous acceptez."],
      ["Quels frais pour le client ?", "Le client paye 10 MAD à la réservation. C'est tout."],
      ["Combien de temps pour la vérification ?", "Sous 24–48h après envoi des documents."],
      ["Scooters et motos ?", "Oui. Tout deux-roues."],
      ["Et en cas d'annulation ?", "Les règles suivent nos CGU. Les 50 MAD ne sont prélevés QUE si VOUS confirmez."],
      ["Faut-il être à Casablanca ?", "Non. 16 villes au Maroc."],
    ],
    socialTitle: "Premiers partenaires en croissance",
    socialSub: "On démarre. Ce sont de vraies agences sur la plateforme aujourd'hui.",
    finalH1: "Prêt à développer votre agence ?",
    finalSub: "Démarrez l'essai Pro 30 jours. Sans carte. Sans engagement.",
    contact: "Des questions ? Écrivez à contact@motonita.ma",
  },
  ar: {
    pill: "للوكالات",
    h1: "طوّر وكالة الكراء معنا",
    sub: "50 درهم ثابتة على كل حجز مؤكد. 0% عمولة. تحتفظ بـ100% من مدخولك.",
    ctaTrial: "ابدأ التجربة المجانية 30 يومًا",
    ctaLogin: "تسجيل الدخول",
    trust: "وكالات موثقة · حجز في 60 ثانية · كاش بلوس مقبول",
    compareTitle: "لماذا تنتقل الوكالات إلى موتونيتا",
    foreignApps: "تطبيقات أجنبية",
    motonita: "موتونيتا",
    rows: [
      ["العمولة على كل حجز", "15–25% من سعر الكراء", "0% عمولة"],
      ["رسوم الحجز", "خفية ومتغيرة", "50 درهم ثابتة لكل حجز مؤكد"],
      ["الدفع", "محجوز 7–14 يوم", "تتقاضى مباشرة خارج المنصة"],
      ["الدعم المحلي", "بالإنجليزية فقط", "عربية وفرنسية وإنجليزية"],
      ["الدفع المحلي", "بطاقة فقط", "بطاقة + كاش بلوس"],
      ["التفعيل", "أسابيع للموافقة", "موثق في أيام"],
    ],
    exampleTitle: "مثال: كراء 3 أيام بـ400 درهم/يوم (1,200 درهم)",
    foreignKeeps: "تطبيق أجنبي: تحتفظ بحوالي 960 درهم",
    motonitaKeeps: "موتونيتا: تحتفظ بـ1,150 درهم",
    featuresTitle: "كل ما تحتاجه لإدارة أسطولك",
    features: [
      ["لوحة تحكم ذكية", "الحجوزات والتقويم والأسطول والمدخول في شاشة واحدة."],
      ["إعلانات غير محدودة", "Pro و Business يدعمان عددًا غير محدود من الدراجات."],
      ["دفع مباشر", "يدفع لك العميل مباشرة، بدون حجز 7 أيام."],
      ["محادثة مع العميل", "تحدّث مع العميل داخل التطبيق بعد تأكيد الحجز."],
      ["تحليلات", "تتبع التحويل والإشغال والأكثر طلبًا."],
      ["التوثيق", "شارة الوكالة الموثقة ترفع الثقة والحجوزات."],
    ],
    howTitle: "كيف يعمل",
    steps: [
      ["التسجيل", "أنشئ وكالتك في أقل من دقيقتين."],
      ["أضف الدراجات", "صور وأسعار وتكون متاحًا."],
      ["استلم الحجوزات", "العميل يحجز ويدفع 10 دراهم رسوم المنصة."],
      ["أكّد واربح", "نسحب 50 درهم من المحفظة وتحتفظ بسعر الكراء."],
    ],
    pricingTitle: "أسعار بسيطة. بدون مفاجآت.",
    monthly: "شهري",
    yearly: "سنوي (وفّر 20%)",
    perMonth: "/شهر",
    perYear: "/سنة",
    mostPopular: "الأكثر شعبية",
    plans: [
      { name: "مجاني", priceM: 0, priceY: 0, tagline: "للتجربة", features: ["مدرج في البحث", "حتى 3 دراجات", "لوحة تحكم أساسية", "محادثة داخل التطبيق"], cta: "ابدأ مجانًا" },
      { name: "Pro", priceM: 99, priceY: 950, tagline: "للوكالات النامية", features: ["كل ما في المجاني", "دراجات غير محدودة", "ظهور مميز", "لوحة تحليلات", "دعم أولوية"], cta: "ابدأ التجربة 30 يومًا", highlight: true },
      { name: "Business", priceM: 299, priceY: 2870, tagline: "لأساطيل متعددة المواقع", features: ["كل ما في Pro", "مواقع متعددة", "API", "مدير حساب مخصص", "عقود مخصصة"], cta: "تواصل مع المبيعات" },
    ],
    trialTitle: "كيف تعمل التجربة",
    trialCards: [
      ["اليوم 1", "التسجيل — Pro مفتوح فورًا. بدون بطاقة."],
      ["الأيام 1–30", "اعرض دراجاتك واستلم حجوزات حقيقية."],
      ["اليوم 25", "نذكرك بلطف لاختيار خطتك."],
      ["اليوم 30", "تنتهي التجربة. اختر Pro أو Business أو المجاني."],
    ],
    trialWarn: "إذا لم تختر خطة قبل اليوم 33 (3 أيام مهلة)، تختفي إعلاناتك حتى الترقية أو الانتقال للمجاني.",
    faqTitle: "أسئلة الوكالات",
    faqs: [
      ["كم تحاسبني موتونيتا فعليًا؟", "50 درهم ثابتة لكل حجز مؤكد تُسحب من محفظتك. لا عمولة. والعميل يدفع 10 درهم منفصلة."],
      ["هل أحتاج بطاقة للتجربة؟", "لا. التجربة Pro 30 يومًا تبدأ بمجرد التسجيل."],
      ["ماذا بعد التجربة؟", "لديك 3 أيام مهلة. ثم تختفي إعلاناتك حتى الترقية. بياناتك آمنة."],
      ["هل يمكنني الانتقال إلى المجاني؟", "نعم في أي وقت. المجاني يبقيك مدرجًا بـ3 دراجات."],
      ["كيف أتقاضى؟", "العميل يدفع لك مباشرة عند الاستلام — كاش، بطاقة، حسب اتفاقكما."],
      ["كم يدفع العميل للمنصة؟", "10 دراهم فقط عند الحجز."],
      ["كم يستغرق التوثيق؟", "24–48 ساعة عادةً بعد إرسال الوثائق."],
      ["هل أعرض سكوترات ودراجات؟", "نعم، كل ذي عجلتين."],
      ["وماذا عن الإلغاء؟", "حسب شروطنا. ولن تُسحب 50 درهم إلا إذا أنت أكدت الحجز."],
      ["هل يجب أن أكون في الدار البيضاء؟", "لا. نغطي 16 مدينة في المغرب."],
    ],
    socialTitle: "شركاء الإطلاق ينمون معنا",
    socialSub: "نحن في البداية. هذه وكالات حقيقية على المنصة اليوم.",
    finalH1: "جاهز لتطوير وكالتك؟",
    finalSub: "ابدأ تجربة Pro 30 يومًا اليوم. بدون بطاقة. بدون التزام.",
    contact: "أسئلة؟ contact@motonita.ma",
  },
};

const FEATURE_ICONS = [LayoutDashboard, Bike, Wallet, MessageCircle, BarChart3, ShieldCheck];

const Agencies = () => {
  const { language } = useLanguage();
  const lang = (["en", "fr", "ar"].includes(language) ? language : "en") as Lang;
  const t = COPY[lang];
  const isRTL = lang === "ar";
  const [yearly, setYearly] = useState(false);
  const navigate = useNavigate();

  // Role-aware destinations: where each CTA on this page should send the user.
  // Anonymous → standard agency signup/login flow.
  // Logged-in renter without agency role → agency signup wizard (which becomes
  //   "add agency profile" because they're already authenticated).
  // Logged-in agency → straight to the dashboard.
  const authedUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasAgencyRole = !!authedUser?.roles?.agency?.active;
  const trialHref = !isAuthenticated
    ? "/agency/signup"
    : hasAgencyRole
      ? "/agency/dashboard"
      : "/agency/signup";
  const loginHref = !isAuthenticated
    ? "/agency/login"
    : hasAgencyRole
      ? "/agency/dashboard"
      : "/agency/signup";
  const planHref = (planSlug: "free" | "pro" | "business") => {
    if (planSlug === "business") return "mailto:contact@motonita.ma";
    if (isAuthenticated && hasAgencyRole) return "/agency/dashboard";
    if (isAuthenticated) return "/agency/signup";
    return planSlug === "pro" ? "/agency/signup?plan=pro" : "/agency/signup";
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Motonita for Agencies — 0% commission, flat 50 MAD per booking";
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? "";
    if (meta) {
      meta.setAttribute(
        "content",
        "List your motorbikes & scooters on Motonita. Flat 50 MAD per confirmed booking. Keep 100% of your rental price. 30-day free Pro trial — no credit card required.",
      );
    }
    return () => {
      document.title = prevTitle;
      if (meta) meta.setAttribute("content", prevDesc);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <Header />

      {/* HERO */}
      <section
        className="relative overflow-hidden border-b"
        style={{ background: FOREST }}
      >
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-3xl">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tracking-wider"
              style={{ background: LIME, color: FOREST }}
            >
              <Sparkles className="h-3.5 w-3.5" /> {t.pill}
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight text-white tracking-tight">
              {t.h1}
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/80 max-w-2xl">{t.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/agency/signup">
                <Button
                  className="h-12 px-8 rounded-md font-bold hover:opacity-90"
                  style={{ background: LIME, color: FOREST }}
                >
                  {t.ctaTrial}
                </Button>
              </Link>
              <Link to="/agency/login">
                <Button
                  variant="outline"
                  className="h-12 px-8 rounded-md font-semibold border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
                >
                  {t.ctaLogin}
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/60 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" style={{ color: LIME }} />
              {t.trust}
            </p>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight" style={{ color: FOREST }}>
          {t.compareTitle}
        </h2>
        <div className="mt-12 max-w-4xl mx-auto rounded-2xl border bg-card overflow-hidden">
          <div className="grid grid-cols-3 bg-muted/40 text-sm font-semibold">
            <div className="px-4 py-4" />
            <div className="px-4 py-4 text-center text-muted-foreground">{t.foreignApps}</div>
            <div className="px-4 py-4 text-center" style={{ color: FOREST }}>{t.motonita}</div>
          </div>
          {t.rows.map((row: string[], i: number) => (
            <div key={i} className="grid grid-cols-3 border-t text-sm">
              <div className="px-4 py-4 font-medium">{row[0]}</div>
              <div className="px-4 py-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                <X className="h-4 w-4 text-destructive shrink-0" /> <span>{row[1]}</span>
              </div>
              <div className="px-4 py-4 text-center font-medium flex items-center justify-center gap-2" style={{ color: FOREST }}>
                <Check className="h-4 w-4 shrink-0" style={{ color: "#15803d" }} /> <span>{row[2]}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 max-w-3xl mx-auto rounded-xl p-6 border-2" style={{ borderColor: LIME, background: `${LIME}15` }}>
          <p className="font-semibold text-base" style={{ color: FOREST }}>{t.exampleTitle}</p>
          <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><X className="h-4 w-4 text-destructive" />{t.foreignKeeps}</div>
            <div className="flex items-center gap-2 font-semibold" style={{ color: FOREST }}><Check className="h-4 w-4" style={{ color: "#15803d" }} />{t.motonitaKeeps}</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight" style={{ color: FOREST }}>
            {t.featuresTitle}
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {t.features.map((f: string[], i: number) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={i} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: `${LIME}40` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: FOREST }} />
                  </div>
                  <h3 className="font-bold text-lg" style={{ color: FOREST }}>{f[0]}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f[1]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight" style={{ color: FOREST }}>
          {t.howTitle}
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {t.steps.map((s: string[], i: number) => (
            <div key={i} className="relative rounded-xl border bg-card p-6">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg mb-4"
                style={{ background: LIME, color: FOREST }}
              >
                {i + 1}
              </div>
              <h3 className="font-bold" style={{ color: FOREST }}>{s[0]}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s[1]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-muted/30 border-y" id="pricing">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight" style={{ color: FOREST }}>
            {t.pricingTitle}
          </h2>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1 border">
              <button
                onClick={() => setYearly(false)}
                className={cn("px-4 py-1.5 text-sm font-semibold rounded-full transition", !yearly ? "bg-card shadow-sm" : "text-muted-foreground")}
                style={!yearly ? { color: FOREST } : undefined}
              >
                {t.monthly}
              </button>
              <button
                onClick={() => setYearly(true)}
                className={cn("px-4 py-1.5 text-sm font-semibold rounded-full transition", yearly ? "bg-card shadow-sm" : "text-muted-foreground")}
                style={yearly ? { color: FOREST } : undefined}
              >
                {t.yearly}
              </button>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {t.plans.map((p: any, i: number) => {
              const price = yearly ? p.priceY : p.priceM;
              const suffix = yearly ? t.perYear : t.perMonth;
              const isHighlight = p.highlight;
              const planSlug = p.name.toLowerCase().includes("pro") ? "pro" : p.name.toLowerCase().includes("business") ? "business" : "free";
              const href = planSlug === "business" ? "mailto:contact@motonita.ma" : `/agency/signup${planSlug === "pro" ? "?plan=pro" : ""}`;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative rounded-2xl border bg-card p-6 flex flex-col",
                    isHighlight && "border-2 shadow-lg md:scale-105",
                  )}
                  style={isHighlight ? { borderColor: LIME } : undefined}
                >
                  {isHighlight && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      style={{ background: LIME, color: FOREST }}
                    >
                      <Star className="h-3 w-3 fill-current" /> {t.mostPopular}
                    </span>
                  )}
                  <h3 className="text-xl font-bold" style={{ color: FOREST }}>{p.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold" style={{ color: FOREST }}>
                      {price === 0 ? "0" : price.toLocaleString()}
                    </span>
                    <span className="text-base font-semibold" style={{ color: FOREST }}>MAD</span>
                    <span className="text-sm text-muted-foreground">{suffix}</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm flex-1">
                    {p.features.map((f: string, j: number) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#15803d" }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={href} className="mt-6">
                    <Button
                      className={cn("w-full h-11 rounded-md font-semibold")}
                      style={isHighlight ? { background: LIME, color: FOREST } : { background: FOREST, color: "white" }}
                    >
                      {p.cta}
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRIAL EXPLAINER */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight" style={{ color: FOREST }}>
          {t.trialTitle}
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {t.trialCards.map((c: string[], i: number) => {
            const icons = [Sparkles, Calendar, Bell, Lock];
            const Icon = icons[i];
            return (
              <div key={i} className="rounded-xl border bg-card p-6">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${LIME}40` }}>
                  <Icon className="h-5 w-5" style={{ color: FOREST }} />
                </div>
                <p className="font-bold text-sm tracking-wide uppercase" style={{ color: FOREST }}>{c[0]}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c[1]}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 max-w-4xl mx-auto rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-5 flex gap-3">
          <Lock className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">{t.trialWarn}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16 lg:py-24 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight" style={{ color: FOREST }}>
            {t.faqTitle}
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {t.faqs.map((f: string[], i: number) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-left font-semibold" style={{ color: FOREST }}>
                  {f[0]}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f[1]}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-tight" style={{ color: FOREST }}>
          {t.socialTitle}
        </h2>
        <p className="text-center text-muted-foreground mt-3">{t.socialSub}</p>
        <div className="mt-10 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6">
              <div className="flex gap-1 mb-3">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" style={{ color: "#f59e0b" }} />
                ))}
              </div>
              <p className="text-sm leading-relaxed">
                {lang === "fr"
                  ? "On a listé en 10 minutes. Premier client en 2 jours. Aucune commission, c'est ce qu'on cherchait."
                  : lang === "ar"
                  ? "أدرجنا في 10 دقائق. أول عميل بعد يومين. بدون عمولة — هذا ما كنا نبحث عنه."
                  : "Listed in 10 minutes. First booking in 2 days. No commission — exactly what we needed."}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: LIME, color: FOREST }}>
                  {["A", "M", "K"][i - 1]}
                </div>
                <div className="text-xs">
                  <p className="font-semibold" style={{ color: FOREST }}>
                    {["Atlas Moto Rent", "Marrakech Scooters", "Kasbah Bikes"][i - 1]}
                  </p>
                  <p className="text-muted-foreground">{["Casablanca", "Marrakech", "Tangier"][i - 1]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ background: FOREST }}>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-2xl mx-auto">
            {t.finalH1}
          </h2>
          <p className="mt-4 text-white/80 max-w-xl mx-auto text-lg">{t.finalSub}</p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/agency/signup">
              <Button
                className="h-12 px-8 rounded-md font-bold hover:opacity-90"
                style={{ background: LIME, color: FOREST }}
              >
                {t.ctaTrial}
                <ArrowRight className="h-4 w-4 ltr:ml-2 rtl:mr-2 rtl:rotate-180" />
              </Button>
            </Link>
            <Link to="/agency/login">
              <Button
                variant="outline"
                className="h-12 px-8 rounded-md font-semibold border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
              >
                {t.ctaLogin}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/60">{t.contact}</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Agencies;
