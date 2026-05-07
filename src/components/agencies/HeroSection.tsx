import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const HERO_IMG =
  "https://images.pexels.com/photos/2519374/pexels-photo-2519374.jpeg?auto=compress&cs=tinysrgb&w=1920";

export const HeroSection = () => {
  return (
    <section
      className="relative min-h-[100vh] flex items-center text-white"
      aria-label="For rental agencies"
    >
      <img
        src={HERO_IMG}
        alt="Motorbike rider in Morocco"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 py-24">
        <div className="max-w-[640px]">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] mb-5 text-[#9FE870]">
            FOR RENTAL AGENCIES
          </p>
          <h1 className="font-bold leading-[1.05] text-[40px] sm:text-[56px] mb-5">
            Fill your fleet.
            <br />
            Keep 100% of every rental.
          </h1>
          <p className="text-lg sm:text-xl text-white/90 mb-8 leading-relaxed">
            Motonita is Morocco's first peer-to-peer motorbike rental
            marketplace. List your bikes for free. We send you tourists.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <Link
              to="/agency/signup"
              className="inline-flex items-center justify-center rounded-lg bg-[#9FE870] text-[#163300] font-semibold px-7 py-4 text-base hover:bg-[#8fd560] transition-colors shadow-lg"
            >
              Start listing — it's free →
            </Link>
            <Link
              to="/agency/login"
              className="text-white/90 underline-offset-4 hover:underline text-sm"
            >
              Already have an account? Log in
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
            {["Free during launch", "No commission", "Setup in 10 minutes"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#9FE870]" /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
