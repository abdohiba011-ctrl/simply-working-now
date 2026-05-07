import { Link } from "react-router-dom";
import { UserPlus, Camera, CheckCircle, TrendingUp } from "lucide-react";

const STEPS = [
  { Icon: UserPlus, title: "Sign up", body: "Create your account with your business info. Free, instant, no credit card." },
  { Icon: Camera, title: "Add your bikes", body: "Upload photos, set prices, add details. Each bike takes 5 minutes to list." },
  { Icon: CheckCircle, title: "Get verified", body: "Our team reviews your listing within 24 hours. Verified agencies get a trust badge." },
  { Icon: TrendingUp, title: "Start earning", body: "Tourists book directly. They pay you at pickup. You keep 100%." },
];

export const HowItWorksSection = () => (
  <section className="bg-[#F5F5F5] py-20 sm:py-24 px-6">
    <div className="mx-auto max-w-[1200px]">
      <h2 className="text-3xl sm:text-4xl font-bold text-[#163300] text-center mb-14">
        List your first bike in 10 minutes
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map(({ Icon, title, body }, i) => (
          <div
            key={title}
            className="bg-white rounded-2xl p-6 border border-[#163300]/10 hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-[#9FE870] flex items-center justify-center mb-4">
              <Icon className="h-6 w-6 text-[#163300]" />
            </div>
            <div className="text-xs font-semibold text-[#163300]/60 mb-1">STEP {i + 1}</div>
            <h3 className="text-lg font-bold text-[#163300] mb-2">{title}</h3>
            <p className="text-[#4A5568] text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <Link
          to="/agency/signup"
          className="inline-flex items-center justify-center rounded-lg bg-[#163300] text-white font-semibold px-7 py-4 hover:bg-[#0f2400] transition-colors"
        >
          Start listing — it's free →
        </Link>
      </div>
    </div>
  </section>
);
