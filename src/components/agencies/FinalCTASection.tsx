import { Link } from "react-router-dom";

export const FinalCTASection = () => (
  <section className="bg-[#9FE870] text-[#163300] py-20 sm:py-24 px-6">
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight">
        Ready to grow your rental business?
      </h2>
      <p className="text-lg sm:text-xl mb-8 text-[#163300]/80">
        Join Motonita. Free. No commitment. Setup in 10 minutes.
      </p>
      <Link
        to="/agency/signup"
        className="inline-flex items-center justify-center rounded-lg bg-[#163300] text-white font-semibold px-8 py-4 text-lg hover:bg-[#0f2400] transition-colors shadow-lg"
      >
        Sign up your agency →
      </Link>
      <p className="mt-6 text-sm text-[#163300]/70">
        Questions? Reach us at{" "}
        <a href="mailto:agencies@motonita.ma" className="underline font-medium">
          agencies@motonita.ma
        </a>
      </p>
    </div>
  </section>
);
