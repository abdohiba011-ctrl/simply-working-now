export type FAQCategory = "renters" | "agencies" | "trust";

export interface FAQItem {
  id: number;
  category: FAQCategory;
  question_en: string;
  question_fr: string;
  question_ar: string;
  answer_en: string;
  answer_fr: string;
  answer_ar: string;
}

export const faqData: FAQItem[] = [
  {
    id: 1,
    category: "renters",
    question_en: "How do I rent a motorbike or scooter on Motonita?",
    question_fr: "Comment louer une moto ou un scooter sur Motonita ?",
    question_ar: "كيف أكري موطور أو سكوتر على موطونيتا؟",
    answer_en: "Select your city, pick a neighborhood, and choose your dates. Browse verified agencies near you and tap any bike to see photos and details. Click 'Book' and pay the 10 MAD booking fee to unlock chat with the agency. Agree on pickup details, and the agency confirms your booking. The whole process takes under 60 seconds.",
    answer_fr: "Sélectionnez votre ville, choisissez un quartier et vos dates. Parcourez les agences vérifiées près de chez vous et cliquez sur une moto pour voir les photos et détails. Cliquez sur 'Réserver' et payez les frais de réservation de 10 MAD pour débloquer le chat avec l'agence. Accordez-vous sur le retrait, et l'agence confirme votre réservation. Le processus complet prend moins de 60 secondes.",
    answer_ar: "اختر مدينتك، حدد الحي والتواريخ. تصفح الوكالات الموثقة القريبة منك واضغط على أي موطور لمشاهدة الصور والتفاصيل. اضغط على 'احجز' وادفع رسوم الحجز 10 دراهم لفتح الدردشة مع الوكالة. اتفق على موعد الاستلام، وتقوم الوكالة بتأكيد حجزك. العملية كاملة تستغرق أقل من 60 ثانية."
  },
  {
    id: 2,
    category: "renters",
    question_en: "Do I need a driver's license to rent a motorbike in Morocco?",
    question_fr: "Ai-je besoin d'un permis de conduire pour louer une moto au Maroc ?",
    question_ar: "هل أحتاج رخصة سياقة لكراء موطور في المغرب؟",
    answer_en: "Yes. For motorbikes above 50cc, you need a valid motorcycle license (Permis A or A1, depending on engine size). For scooters under 50cc, most agencies accept a standard driver's license or a national ID. Each listing shows the exact requirement — check before booking.",
    answer_fr: "Oui. Pour les motos de plus de 50cc, il faut un permis moto valide (Permis A ou A1 selon la cylindrée). Pour les scooters moins de 50cc, la plupart des agences acceptent un permis voiture standard ou une CIN. Chaque annonce indique l'exigence exacte — vérifiez avant de réserver.",
    answer_ar: "نعم. بالنسبة للموطورات أكثر من 50cc، تحتاج رخصة سياقة موطور سارية (Permis A أو A1 حسب الحجم). للسكوتر أقل من 50cc، معظم الوكالات تقبل رخصة سياقة عادية أو البطاقة الوطنية. كل إعلان يوضح المطلوب بدقة — تحقق قبل الحجز."
  },
  {
    id: 3,
    category: "renters",
    question_en: "What payment methods are accepted on Motonita?",
    question_fr: "Quels moyens de paiement sont acceptés sur Motonita ?",
    question_ar: "ما هي طرق الدفع المقبولة على موطونيتا؟",
    answer_en: "We accept Moroccan bank cards, international Visa and Mastercard, and Cash Plus for customers without a card. The 10 MAD booking fee is paid online through YouCan Pay. The rental payment itself is handled directly between you and the agency — cash or card, whatever you agree on at pickup.",
    answer_fr: "Nous acceptons les cartes bancaires marocaines, Visa et Mastercard internationales, et Cash Plus pour les clients sans carte. Les frais de réservation de 10 MAD sont payés en ligne via YouCan Pay. Le paiement de la location se fait directement entre vous et l'agence — espèces ou carte, selon votre accord au retrait.",
    answer_ar: "نقبل البطاقات البنكية المغربية، Visa و Mastercard الدولية، وكاش بلوس للعملاء بدون بطاقة. رسوم الحجز 10 دراهم تُدفع عبر الإنترنت من خلال YouCan Pay. دفع ثمن الكراء يتم مباشرة بينك وبين الوكالة — نقدًا أو بطاقة، حسب اتفاقكما عند الاستلام."
  },
  {
    id: 4,
    category: "renters",
    question_en: "How much does it cost to rent a motorbike in Morocco?",
    question_fr: "Combien coûte la location d'une moto au Maroc ?",
    question_ar: "كم يكلف كراء موطور في المغرب؟",
    answer_en: "Rental prices are set by each agency and depend on the bike type, location, and season. The exact price is shown on every listing before you book. Motonita's only fee is 10 MAD per booking — no commission on the rental price, no hidden charges.",
    answer_fr: "Les prix de location sont fixés par chaque agence et dépendent du type de moto, de l'emplacement et de la saison. Le prix exact est affiché sur chaque annonce avant la réservation. Les seuls frais de Motonita sont 10 MAD par réservation — aucune commission sur le prix, aucuns frais cachés.",
    answer_ar: "أسعار الكراء تحددها كل وكالة وتعتمد على نوع الموطور، الموقع والموسم. السعر الدقيق يظهر في كل إعلان قبل الحجز. الرسوم الوحيدة لموطونيتا هي 10 دراهم لكل حجز — لا عمولة على سعر الكراء ولا رسوم خفية."
  },
  {
    id: 5,
    category: "renters",
    question_en: "How does the booking process work step by step?",
    question_fr: "Comment fonctionne le processus de réservation étape par étape ?",
    question_ar: "كيف تتم عملية الحجز خطوة بخطوة؟",
    answer_en: "1) Find a bike in your city and neighborhood. 2) Click 'Book' and pay the 10 MAD booking fee. 3) Chat with the agency to agree on pickup time and address. 4) The agency confirms your booking inside the platform. 5) You receive a confirmation with all the pickup details. 6) Meet the agency, pay the rental directly to them, and ride.",
    answer_fr: "1) Trouvez une moto dans votre ville et quartier. 2) Cliquez sur 'Réserver' et payez les 10 MAD. 3) Discutez avec l'agence pour l'heure et l'adresse de retrait. 4) L'agence confirme votre réservation sur la plateforme. 5) Vous recevez une confirmation avec tous les détails. 6) Rencontrez l'agence, payez la location directement, et partez.",
    answer_ar: "1) ابحث عن موطور في مدينتك وحيك. 2) اضغط 'احجز' وادفع 10 دراهم. 3) تحدث مع الوكالة للاتفاق على وقت وعنوان الاستلام. 4) تقوم الوكالة بتأكيد حجزك داخل المنصة. 5) تتوصل بتأكيد فيه كل التفاصيل. 6) قابل الوكالة، ادفع الكراء مباشرة، وانطلق."
  },
  {
    id: 6,
    category: "renters",
    question_en: "What is the 10 MAD booking fee for?",
    question_fr: "À quoi sert la commission de réservation de 10 MAD ?",
    question_ar: "ما الغرض من رسوم الحجز 10 دراهم؟",
    answer_en: "The 10 MAD is a reservation fee that unlocks direct chat with the agency and holds the bike while you agree on pickup details. It covers secure payment processing through YouCan Pay, your booking record, and Motonita's dispute support. It is charged once per booking, regardless of rental duration.",
    answer_fr: "Les 10 MAD sont des frais de réservation qui débloquent la discussion directe avec l'agence et réservent la moto pendant que vous convenez du retrait. Ils couvrent le traitement sécurisé via YouCan Pay, votre dossier de réservation et le support en cas de litige. Facturés une seule fois par réservation, peu importe la durée.",
    answer_ar: "10 دراهم هي رسوم حجز تفتح لك الدردشة المباشرة مع الوكالة وتحجز الموطور بينما تتفقان على تفاصيل الاستلام. تغطي معالجة الدفع الآمن عبر YouCan Pay، سجل حجزك، ودعم موطونيتا في حالة النزاع. تُفرض مرة واحدة لكل حجز، بغض النظر عن مدة الكراء."
  },
  {
    id: 7,
    category: "renters",
    question_en: "What documents do I need to provide at pickup?",
    question_fr: "Quels documents dois-je fournir au retrait ?",
    question_ar: "ما الوثائق التي أحتاج تقديمها عند الاستلام؟",
    answer_en: "You need a valid driver's license that matches the bike type, a national ID or passport, and the confirmation message from Motonita. Some agencies also ask for a security deposit (caution) in cash or a card hold — this is set by the agency and shown on each listing.",
    answer_fr: "Il faut un permis valide correspondant au type de moto, une CIN ou un passeport, et le message de confirmation de Motonita. Certaines agences demandent aussi une caution en espèces ou une empreinte carte — fixée par l'agence et indiquée sur l'annonce.",
    answer_ar: "تحتاج رخصة سياقة سارية تناسب نوع الموطور، بطاقة وطنية أو جواز سفر، ورسالة التأكيد من موطونيتا. بعض الوكالات تطلب أيضًا ضمانة (كوسيون) نقدية أو حجز على البطاقة — تحددها الوكالة وتظهر في كل إعلان."
  },
  {
    id: 8,
    category: "renters",
    question_en: "What is the minimum age to rent a motorbike in Morocco?",
    question_fr: "Quel est l'âge minimum pour louer une moto au Maroc ?",
    question_ar: "ما هو الحد الأدنى للسن لكراء موطور في المغرب؟",
    answer_en: "The minimum age depends on engine size: 16 for 50cc scooters, 18 for bikes up to 125cc, and 20 for larger motorbikes. Most agencies also require at least one year of licensed riding experience. The exact requirements are shown on each listing.",
    answer_fr: "L'âge minimum dépend de la cylindrée : 16 ans pour les scooters 50cc, 18 pour les motos jusqu'à 125cc, 20 pour les plus grosses. La plupart des agences exigent aussi au moins un an de permis. Les exigences exactes sont sur chaque annonce.",
    answer_ar: "الحد الأدنى للسن يعتمد على حجم المحرك: 16 للسكوتر 50cc، 18 للموطورات حتى 125cc، و20 للأكبر. معظم الوكالات تشترط أيضًا سنة على الأقل من الخبرة. المتطلبات الدقيقة في كل إعلان."
  },
  {
    id: 9,
    category: "agencies",
    question_en: "How do I list my motorbikes or scooters on Motonita?",
    question_fr: "Comment puis-je lister mes motos ou scooters sur Motonita ?",
    question_ar: "كيف أضيف موطوراتي على موطونيتا؟",
    answer_en: "Create a free agency account, upload your commercial registration (Registre de Commerce) and a photo of your shop, then wait for Motonita to verify you — usually within 48 hours. Once approved, you can list up to 3 bikes for free or unlock unlimited listings with a Pro plan. You only pay 50 MAD per confirmed booking, deducted from your prepaid wallet.",
    answer_fr: "Créez un compte agence gratuit, téléchargez votre Registre de Commerce et une photo de votre boutique, attendez la vérification — généralement sous 48 heures. Une fois approuvé, listez jusqu'à 3 motos gratuitement ou débloquez l'illimité avec Pro. Vous payez 50 MAD par réservation confirmée, déduits de votre portefeuille prépayé.",
    answer_ar: "أنشئ حساب وكالة مجاني، ارفع السجل التجاري وصورة للمحل، وانتظر التحقق من موطونيتا — عادةً خلال 48 ساعة. بعد الموافقة، يمكنك إضافة 3 موطورات مجانًا أو لا محدود مع خطة Pro. تدفع فقط 50 درهم لكل حجز مؤكد، تُخصم من محفظتك المدفوعة مسبقًا."
  },
  {
    id: 10,
    category: "agencies",
    question_en: "How much does Motonita take from each booking?",
    question_fr: "Combien Motonita prend-il sur chaque réservation ?",
    question_ar: "كم تأخذ موطونيتا من كل حجز؟",
    answer_en: "Nothing on the rental price. You keep 100% of what you charge. Motonita only takes a flat 50 MAD confirmation fee per booking, deducted from your prepaid wallet. Foreign rental apps charge 15 to 20% commission — on a 500 MAD rental that's up to 100 MAD gone. With Motonita, it's always 50 MAD flat.",
    answer_fr: "Rien sur le prix de la location. Vous gardez 100% de ce que vous facturez. Motonita prélève seulement 50 MAD fixes de confirmation par réservation, depuis votre portefeuille. Les apps étrangères prennent 15 à 20% — sur une location de 500 MAD ça fait 100 MAD envolés. Chez Motonita, c'est toujours 50 MAD fixe.",
    answer_ar: "لا شيء من سعر الكراء. تحتفظ بـ 100% مما تتقاضاه. موطونيتا تأخذ فقط رسوم تأكيد ثابتة 50 درهم لكل حجز، تُخصم من محفظتك. التطبيقات الأجنبية تأخذ 15 إلى 20% عمولة — على كراء 500 درهم يذهب منك حتى 100 درهم. مع موطونيتا، دائمًا 50 درهم ثابتة."
  },
  {
    id: 11,
    category: "agencies",
    question_en: "Can I manage bookings that don't come from Motonita?",
    question_fr: "Puis-je gérer les réservations qui ne viennent pas de Motonita ?",
    question_ar: "هل يمكنني إدارة الحجوزات التي لا تأتي من موطونيتا؟",
    answer_en: "Yes. Your agency dashboard lets you log walk-in rentals, repeat clients, and bookings from other channels — all in one place. You only pay the 50 MAD fee on bookings that come through Motonita. Bookings you log manually are free.",
    answer_fr: "Oui. Votre tableau de bord agence permet d'enregistrer les locations walk-in, clients fidèles et réservations d'autres canaux — tout au même endroit. Vous payez les 50 MAD uniquement sur les réservations venant de Motonita. Les réservations manuelles sont gratuites.",
    answer_ar: "نعم. لوحة تحكم وكالتك تتيح لك تسجيل الكراءات المباشرة، العملاء الدائمين، والحجوزات من قنوات أخرى — كل شيء في مكان واحد. تدفع رسوم 50 درهم فقط على الحجوزات القادمة من موطونيتا. الحجوزات اليدوية مجانية."
  },
  {
    id: 12,
    category: "agencies",
    question_en: "What are the agency subscription plans?",
    question_fr: "Quels sont les plans d'abonnement agence ?",
    question_ar: "ما هي باقات الاشتراك للوكالات؟",
    answer_en: "Free plan: up to 3 bikes, basic dashboard, verified badge. Pro plan (99 MAD/month): unlimited bikes, analytics, featured placement in search. Business plan (299 MAD/month): multi-location support, API access, dedicated account manager. All plans pay the same 50 MAD per confirmed booking.",
    answer_fr: "Plan Gratuit : jusqu'à 3 motos, dashboard de base, badge vérifié. Plan Pro (99 MAD/mois) : motos illimitées, analytics, placement en tête. Plan Business (299 MAD/mois) : multi-sites, accès API, gestionnaire dédié. Tous les plans paient 50 MAD par réservation confirmée.",
    answer_ar: "الخطة المجانية: حتى 3 موطورات، لوحة تحكم أساسية، شارة التحقق. خطة Pro (99 درهم/شهر): موطورات غير محدودة، تحليلات، ظهور مميز في البحث. خطة Business (299 درهم/شهر): دعم متعدد المواقع، API، مدير حساب مخصص. جميع الخطط تدفع 50 درهم لكل حجز مؤكد."
  },
  {
    id: 13,
    category: "agencies",
    question_en: "How do I get paid by the renter?",
    question_fr: "Comment suis-je payé par le locataire ?",
    question_ar: "كيف أستلم الدفع من المستأجر؟",
    answer_en: "Motonita does not handle the rental payment — it's between you and the renter directly. You can accept cash on pickup, local bank card, bank transfer, or any method you agree on. The only transaction that passes through Motonita is the 50 MAD fee deducted from your wallet when you confirm the booking.",
    answer_fr: "Motonita ne gère pas le paiement de la location — c'est entre vous et le locataire. Vous pouvez accepter espèces au retrait, carte locale, virement, ou toute méthode convenue. La seule transaction qui passe par Motonita, ce sont les 50 MAD déduits de votre portefeuille à la confirmation.",
    answer_ar: "موطونيتا لا تتعامل مع دفع الكراء — هو بينك وبين المستأجر مباشرة. يمكنك قبول النقد عند الاستلام، بطاقة بنكية محلية، تحويل بنكي، أو أي طريقة تتفقان عليها. المعاملة الوحيدة التي تمر عبر موطونيتا هي رسوم 50 درهم المخصومة من محفظتك عند تأكيد الحجز."
  },
  {
    id: 14,
    category: "trust",
    question_en: "How do I know the agency is trustworthy?",
    question_fr: "Comment savoir si l'agence est fiable ?",
    question_ar: "كيف أعرف أن الوكالة موثوقة؟",
    answer_en: "Every agency on Motonita is verified before being listed. We check their commercial registration, business address, and insurance documents. Agencies with complaints or fake listings are removed immediately. Look for the 'Verified' badge on every listing — it's your guarantee the agency is real.",
    answer_fr: "Chaque agence sur Motonita est vérifiée avant d'être listée. Nous vérifions le registre de commerce, l'adresse et les documents d'assurance. Les agences avec plaintes ou annonces fictives sont supprimées immédiatement. Cherchez le badge 'Vérifiée' sur chaque annonce — c'est votre garantie.",
    answer_ar: "كل وكالة على موطونيتا تتم مراجعتها قبل الإدراج. نتحقق من السجل التجاري، العنوان، ووثائق التأمين. الوكالات التي عليها شكاوى أو إعلانات مزيفة تُحذف فورًا. ابحث عن شارة 'موثقة' على كل إعلان — هي ضمانك."
  },
  {
    id: 15,
    category: "trust",
    question_en: "Is insurance included with the rental?",
    question_fr: "L'assurance est-elle incluse dans la location ?",
    question_ar: "هل التأمين مشمول مع الكراء؟",
    answer_en: "Insurance is provided by the agency, not Motonita. Every verified agency must carry valid motor insurance that covers the rider during the rental period. The type of coverage (third-party, damage, theft) varies by agency and is shown on each listing. Always check the insurance details before confirming your booking.",
    answer_fr: "L'assurance est fournie par l'agence, pas par Motonita. Chaque agence vérifiée doit avoir une assurance moto valide couvrant le conducteur pendant la location. Le type de couverture (tiers, dommages, vol) varie et est indiqué sur chaque annonce. Vérifiez toujours avant de confirmer.",
    answer_ar: "التأمين تقدمه الوكالة، وليس موطونيتا. كل وكالة موثقة يجب أن يكون لديها تأمين موطور ساري يغطي السائق خلال فترة الكراء. نوع التغطية (ضد الغير، الأضرار، السرقة) يختلف حسب الوكالة ويظهر في كل إعلان. تحقق دائمًا قبل التأكيد."
  },
  {
    id: 16,
    category: "trust",
    question_en: "What happens if there's a problem during the rental?",
    question_fr: "Que faire en cas de problème pendant la location ?",
    question_ar: "ماذا يحدث إذا وقعت مشكلة خلال الكراء؟",
    answer_en: "If anything goes wrong — breakdown, accident, dispute — contact the agency first through the in-app chat. If they don't respond or the problem isn't resolved, use the 'Report a problem' button on your booking page. Motonita's admin team reviews every case and can freeze the agency's account if needed.",
    answer_fr: "En cas de problème — panne, accident, litige — contactez d'abord l'agence via le chat. Si aucune réponse ou problème non résolu, utilisez le bouton 'Signaler un problème' sur votre page de réservation. L'équipe Motonita examine chaque cas et peut geler le compte de l'agence si nécessaire.",
    answer_ar: "إذا حدث أي مشكل — عطل، حادثة، نزاع — تواصل مع الوكالة أولاً عبر الدردشة. إذا لم يستجيبوا أو لم يُحل المشكل، استخدم زر 'الإبلاغ عن مشكلة' في صفحة حجزك. فريق موطونيتا يراجع كل حالة ويمكنه تجميد حساب الوكالة عند الحاجة."
  },
  {
    id: 17,
    category: "trust",
    question_en: "Does Motonita offer delivery and pickup services?",
    question_fr: "Motonita propose-t-il la livraison et récupération ?",
    question_ar: "هل تقدم موطونيتا خدمة التوصيل والاستلام؟",
    answer_en: "Delivery depends on the agency, not Motonita. Many agencies offer free delivery within their neighborhood, and some deliver to airports or hotels for an extra fee. Check the delivery options on each listing, or ask the agency directly through the in-app chat before booking.",
    answer_fr: "La livraison dépend de l'agence, pas de Motonita. Beaucoup offrent la livraison gratuite dans leur quartier, d'autres livrent à l'aéroport ou hôtel moyennant frais. Vérifiez les options sur chaque annonce ou demandez via le chat avant de réserver.",
    answer_ar: "التوصيل يعتمد على الوكالة، وليس موطونيتا. كثير من الوكالات توفر التوصيل المجاني داخل الحي، والبعض يوصل إلى المطار أو الفندق برسوم إضافية. تحقق من خيارات التوصيل في كل إعلان، أو اسأل الوكالة مباشرة عبر الدردشة قبل الحجز."
  }
];

export const faqUI = {
  en: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know about renting a motorbike or scooter on Motonita.",
    searchPlaceholder: "Search questions...",
    tabs: { all: "All", renters: "For Renters", agencies: "For Agencies", trust: "Trust & Safety" },
    cta: { text: "Still have questions? Contact our support team.", button: "Contact Us" },
    noResults: "No questions match your search."
  },
  fr: {
    title: "Questions Fréquentes",
    subtitle: "Tout ce qu'il faut savoir pour louer une moto ou un scooter sur Motonita.",
    searchPlaceholder: "Rechercher une question...",
    tabs: { all: "Tous", renters: "Pour Locataires", agencies: "Pour Agences", trust: "Confiance & Sécurité" },
    cta: { text: "D'autres questions ? Contactez notre équipe.", button: "Nous Contacter" },
    noResults: "Aucune question ne correspond à votre recherche."
  },
  ar: {
    title: "الأسئلة الشائعة",
    subtitle: "كل ما تحتاج معرفته لكراء موطور أو سكوتر على موطونيتا.",
    searchPlaceholder: "ابحث عن سؤال...",
    tabs: { all: "الكل", renters: "للمستأجرين", agencies: "للوكالات", trust: "الأمان والثقة" },
    cta: { text: "لديك أسئلة أخرى؟ تواصل مع فريق الدعم.", button: "اتصل بنا" },
    noResults: "لا توجد أسئلة تطابق بحثك."
  }
} as const;
