const STATS = [
  { n: "19.8M", l: "Tourists in 2025" },
  { n: "2030", l: "FIFA World Cup" },
  { n: "1st", l: "Moroccan marketplace" },
  { n: "100%", l: "Of rental income kept" },
];

export const StatsSection = () => (
  <section className="bg-[#163300] text-white py-20 sm:py-24 px-6">
    <div className="mx-auto max-w-[1200px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-14">
        {STATS.map((s) => (
          <div key={s.l} className="text-center">
            <div className="text-4xl sm:text-5xl font-bold text-[#9FE870] mb-2">{s.n}</div>
            <div className="text-sm sm:text-base text-white/80">{s.l}</div>
          </div>
        ))}
      </div>
      <blockquote className="max-w-2xl mx-auto text-center">
        <p className="text-xl sm:text-2xl font-medium leading-relaxed mb-4">
          "Motonita gave my shop visibility I couldn't get on my own. The setup was 10 minutes."
        </p>
        <footer className="text-[#9FE870] text-sm font-semibold">
          — Casablanca rental partner
        </footer>
      </blockquote>
    </div>
  </section>
);
