import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link as LinkIcon,
  Send,
  Gift,
  Wallet,
  ShieldCheck,
  Calendar,
  Check,
  Copy,
  MessageCircle,
  Instagram,
  Share2,
  Users,
  AlertCircle,
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
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthStore } from "@/stores/useAuthStore";

// Brand tokens
const LIME_BG = "hsl(96 73% 67%)"; // #9FE870
const FOREST = "hsl(89 100% 10%)"; // #163300

const PAGE_TITLE = "Refer & Earn — Invite friends, earn real money | Motonita";
const PAGE_DESC =
  "Invite friends to Motonita. They get their first booking fee free. You earn 10 MAD when they complete their first confirmed rental. Paid weekly from 50 MAD.";

const Affiliate = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const referralRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [stats, setStats] = useState<{
    invited: number;
    signedUp: number;
    booked: number;
    completed: number;
    approvedBalanceMad: number;
    paidTotalMad: number;
  }>({ invited: 0, signedUp: 0, booked: 0, completed: 0, approvedBalanceMad: 0, paidTotalMad: 0 });

  const referralLinkAvailable = !!referralCode;
  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : "";

  // Fetch (or create) the user's referral code + stats once authenticated.
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setReferralCode(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setCodeLoading(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { fetchReferralStats } = await import("@/lib/referral");
        const [{ data: code, error: codeErr }, freshStats] = await Promise.all([
          supabase.rpc("get_or_create_referral_code"),
          fetchReferralStats(userId),
        ]);
        if (cancelled) return;
        if (codeErr) {
          console.warn("[affiliate] could not load referral code", codeErr);
        } else if (typeof code === "string") {
          setReferralCode(code);
        }
        setStats(freshStats);
      } finally {
        if (!cancelled) setCodeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  useEffect(() => {
    document.documentElement.lang = language;
    const prevTitle = document.title;
    document.title = PAGE_TITLE;

    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      const prev = tag.getAttribute("content") ?? "";
      tag.setAttribute("content", content);
      return () => {
        if (prev) tag!.setAttribute("content", prev);
        else tag!.remove();
      };
    };
    const restoreDesc = setMeta("description", PAGE_DESC);
    return () => {
      document.title = prevTitle;
      restoreDesc();
    };
  }, [language]);

  const faqItems = useMemo(
    () => [
      {
        q: "What does my friend get?",
        a: "Your friend gets their first Motonita booking fee free. The 10 MAD Motonita platform fee becomes 0 MAD on their first eligible booking.",
      },
      {
        q: "What do I earn?",
        a: "You earn 10 MAD after your friend completes their first confirmed rental.",
      },
      {
        q: "When do I get paid?",
        a: "Rewards are paid weekly when your approved balance reaches 50 MAD or more.",
      },
      {
        q: "Do I earn money when someone only signs up?",
        a: "No. Rewards are confirmed only after a real completed rental.",
      },
      {
        q: "Can I invite unlimited friends?",
        a: "Yes, as long as the referrals are real and follow Motonita's rules.",
      },
      {
        q: "Can I refer myself?",
        a: "No. Self-referrals and fake accounts are not allowed.",
      },
      {
        q: "Is the motorbike rental free for my friend?",
        a: "No. Only the Motonita booking fee is free. The agency rental price and any required deposit still apply.",
      },
    ],
    [],
  );

  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    }),
    [faqItems],
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(faqJsonLd);
    script.setAttribute("data-page", "refer-a-friend");
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [faqJsonLd]);

  const scrollToReferral = () => {
    referralRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToHow = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleGetLink = () => {
    if (!isAuthenticated) {
      navigate("/signup?redirect=/affiliate");
      return;
    }
    scrollToReferral();
  };

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ description: "Link copied to clipboard" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ description: "Could not copy link", variant: "destructive" });
    }
  };

  const shareMessage = referralLink
    ? `Try Motonita — rent a scooter or motorbike in Morocco. Use my link and your first booking fee is free: ${referralLink}`
    : "";

  const handleWhatsApp = () => {
    if (!referralLink) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
      "_blank",
      "noopener",
    );
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Motonita", text: shareMessage, url: referralLink });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  const steps = [
    {
      num: "1",
      Icon: LinkIcon,
      title: "Share your link",
      desc: "Send your referral link on WhatsApp, Instagram, or SMS.",
    },
    {
      num: "2",
      Icon: Send,
      title: "Your friend books",
      desc: "They create an account and complete their first confirmed scooter or motorbike rental through Motonita.",
    },
    {
      num: "3",
      Icon: Gift,
      title: "You get paid",
      desc: "After the rental is completed, your 10 MAD reward becomes approved. Payouts are sent weekly when your balance reaches 50 MAD.",
    },
  ];

  const valueCards = [
    {
      Icon: Gift,
      title: "Your friend saves",
      desc: "Their first Motonita booking fee is free. They only pay the agency rental price and any required deposit.",
    },
    {
      Icon: Wallet,
      title: "You earn 10 MAD",
      desc: "When your friend completes their first confirmed rental, you earn 10 MAD — real money, not credits.",
    },
    {
      Icon: Calendar,
      title: "Paid weekly",
      desc: "Once your approved balance reaches 50 MAD or more, Motonita pays you weekly.",
    },
  ];

  const rules = [
    {
      Icon: ShieldCheck,
      title: "Reward only after completion",
      desc: "Your reward is approved after your friend completes their first confirmed rental.",
    },
    {
      Icon: AlertCircle,
      title: "No fake referrals",
      desc: "Self-referrals, duplicate accounts, cancelled bookings, and unpaid bookings are not eligible.",
    },
    {
      Icon: Calendar,
      title: "Weekly payout",
      desc: "Approved balances of 50 MAD or more are paid weekly.",
    },
    {
      Icon: Users,
      title: "Real users only",
      desc: "The invited person must be a new user and complete their first eligible rental.",
    },
  ];

  const trustPoints = [
    "WhatsApp-friendly sharing",
    "Clear reward rules",
    "No reward for fake bookings",
    "Weekly payouts after 50 MAD",
    "Made for real renters, not spam",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        {/* ============ 1. HERO ============ */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[900px] text-center">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: LIME_BG, color: FOREST }}
              >
                Refer & Earn — real money
              </span>

              <h1
                className="mt-6 text-3xl md:text-5xl font-bold leading-tight"
                style={{ color: FOREST }}
              >
                Invite friends. Help them ride. Earn real money.
              </h1>

              <p className="mx-auto mt-5 max-w-[640px] text-base md:text-lg text-muted-foreground">
                Share Motonita with friends who want to rent a scooter or motorbike
                in Morocco. When they complete their first confirmed rental, their
                first Motonita booking fee is free — and you earn 10 MAD.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleGetLink}
                  className="h-11 rounded-md px-6 text-base font-semibold shadow-sm transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: LIME_BG, color: FOREST }}
                >
                  Get my referral link
                </button>
                <button
                  type="button"
                  onClick={scrollToHow}
                  className="h-11 rounded-md border-2 px-6 text-base font-semibold transition-colors hover:bg-muted/50"
                  style={{ borderColor: FOREST, color: FOREST }}
                >
                  How it works
                </button>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Rewards are confirmed only after a real completed rental.
              </p>
            </div>
          </div>
        </section>

        {/* ============ 2. VALUE CARDS ============ */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-3">
              {valueCards.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: LIME_BG }}
                  >
                    <Icon className="h-6 w-6" style={{ color: FOREST }} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: FOREST }}>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 3. HOW IT WORKS ============ */}
        <section id="how-it-works" className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl font-bold" style={{ color: FOREST }}>
                How it works
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Three simple steps. No tricks.
              </p>
            </div>

            <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-3">
              {steps.map(({ num, Icon, title, desc }) => (
                <div
                  key={num}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold"
                      style={{ backgroundColor: LIME_BG, color: FOREST }}
                    >
                      {num}
                    </span>
                    <Icon className="h-6 w-6" style={{ color: FOREST }} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: FOREST }}>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 4. MOROCCO TRUST SECTION ============ */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[900px] text-center">
              <h2 className="text-3xl font-bold" style={{ color: FOREST }}>
                Built for how people share in Morocco
              </h2>
              <p className="mx-auto mt-4 max-w-[700px] text-base text-muted-foreground">
                Most people trust a recommendation from a friend more than an ad.
                That's why Motonita referrals are simple: share your link, help
                someone rent with confidence, and earn money when the rental is real.
              </p>
            </div>

            <ul className="mx-auto mt-10 grid max-w-[900px] gap-3 sm:grid-cols-2">
              {trustPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm"
                >
                  <Check
                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                    style={{ color: FOREST }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium" style={{ color: FOREST }}>
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============ 5. CLARIFICATION BOX ============ */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div
              className="mx-auto max-w-[900px] rounded-2xl border-2 p-6 md:p-8"
              style={{ borderColor: FOREST, backgroundColor: `${LIME_BG}33` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: LIME_BG }}
                >
                  <AlertCircle className="h-6 w-6" style={{ color: FOREST }} aria-hidden />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: FOREST }}>
                    What does "free first booking fee" mean?
                  </h3>
                  <p className="mt-3 text-base" style={{ color: FOREST }}>
                    It means Motonita removes the 10 MAD platform fee from the
                    invited user's first eligible booking. The motorbike rental
                    price, deposit, and agency conditions still apply.
                  </p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: FOREST }}>
                    The full rental is not free — only the Motonita booking fee.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 6. REWARD RULES ============ */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold" style={{ color: FOREST }}>
                Reward rules
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Simple, clear, and fair.
              </p>
            </div>
            <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-2">
              {rules.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: LIME_BG }}
                    >
                      <Icon className="h-5 w-5" style={{ color: FOREST }} aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: FOREST }}>
                        {title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 7. REFERRAL LINK / SHARE BLOCK ============ */}
        <section ref={referralRef} className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[800px] rounded-2xl border-2 bg-card p-6 md:p-10 shadow-sm"
              style={{ borderColor: FOREST }}
            >
              <h2 className="text-center text-2xl md:text-3xl font-bold" style={{ color: FOREST }}>
                Your referral link
              </h2>

              {!isAuthenticated ? (
                <>
                  <p className="mt-4 text-center text-base text-muted-foreground">
                    Sign in to get your personal referral link and start earning real
                    money for every friend who completes their first rental.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => navigate("/signup?redirect=/affiliate")}
                      className="h-11 px-8 font-semibold"
                      style={{ backgroundColor: FOREST, color: "white" }}
                    >
                      Sign in to get your referral link
                    </Button>
                  </div>
                </>
              ) : !referralLinkAvailable ? (
                <div className="mt-6 rounded-lg border border-dashed bg-muted/40 p-6 text-center">
                  <p className="text-base font-medium" style={{ color: FOREST }}>
                    Your referral link will appear here once referrals are activated.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We're finalizing the referral system. You'll be notified the
                    moment your link is ready — no action needed.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-6 flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={referralLink}
                      className="flex-1 rounded-md border bg-muted/30 px-4 py-2.5 font-mono text-sm"
                    />
                    <Button onClick={handleCopy} variant="outline" className="h-11 gap-2">
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Button
                      onClick={handleWhatsApp}
                      className="h-11 gap-2 font-semibold"
                      style={{ backgroundColor: "#25D366", color: "white" }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={handleNativeShare}
                      variant="outline"
                      className="h-11 gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      className="h-11 gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy link
                    </Button>
                  </div>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Instagram className="h-3.5 w-3.5" />
                    For Instagram or TikTok, copy the link and paste it in your bio
                    or story.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ============ 8. FAQ ============ */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[800px]">
              <h2
                className="text-center text-3xl font-bold mb-8"
                style={{ color: FOREST }}
              >
                Frequently asked questions
              </h2>

              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((it, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-start text-base font-semibold">
                      {it.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {it.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ============ 9. FINAL CTA ============ */}
        <section className="py-12 md:py-20" style={{ backgroundColor: LIME_BG }}>
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: FOREST }}>
              Your friends ride with no Motonita fee. You earn 10 MAD.
            </h2>
            <p
              className="mx-auto mt-4 max-w-[600px] text-base md:text-lg"
              style={{ color: FOREST, opacity: 0.85 }}
            >
              Share Motonita today. Real rewards, paid weekly once you reach 50 MAD.
            </p>

            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleGetLink}
                className="h-11 rounded-md px-8 font-semibold hover:opacity-90"
                style={{ backgroundColor: FOREST, color: "white" }}
              >
                Get my referral link
              </Button>
            </div>

            <p className="mt-4 text-sm" style={{ color: FOREST, opacity: 0.75 }}>
              Need help? Reach out to Motonita support anytime.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Affiliate;
