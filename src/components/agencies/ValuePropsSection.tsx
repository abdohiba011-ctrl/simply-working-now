const CARDS = [
  {
    img: "https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Shop owner counting cash",
    title: "100% of your rental income",
    body:
      "Foreign apps charge 20% commission. We don't. You set the price, you keep the price. We make our money from a small flat fee charged to renters — never from you.",
  },
  {
    img: "https://images.pexels.com/photos/4974915/pexels-photo-4974915.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Business owner managing fleet on laptop",
    title: "Run your fleet from anywhere",
    body:
      "Manage bikes, bookings, calendar, and payments from one dashboard. Available in Arabic, French, and English. Built mobile-first for how you actually work.",
  },
  {
    img: "https://images.pexels.com/photos/2335126/pexels-photo-2335126.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Tourists exploring Morocco",
    title: "Reach 19 million tourists",
    body:
      "Morocco welcomed 19.8M tourists in 2025. With FIFA 2030 coming, demand is exploding. We bring those tourists directly to your shop.",
  },
];

export const ValuePropsSection = () => (
  <section className="bg-white py-20 sm:py-24 px-6">
    <div className="mx-auto max-w-[1200px]">
      <h2 className="text-3xl sm:text-4xl font-bold text-[#163300] text-center mb-14">
        Why agencies choose Motonita
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {CARDS.map((c) => (
          <article
            key={c.title}
            className="rounded-2xl overflow-hidden bg-white border border-[#163300]/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#F5F5F5]">
              <img
                src={c.img}
                alt={c.alt}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#163300] mb-3">{c.title}</h3>
              <p className="text-[#4A5568] leading-relaxed">{c.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
