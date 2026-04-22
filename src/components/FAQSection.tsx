import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { faqData, faqUI, type FAQCategory } from "@/data/faqData";
import { cn } from "@/lib/utils";

type TabKey = "all" | FAQCategory;

const TABS: TabKey[] = ["all", "renters", "agencies", "trust"];

export const FAQSection = () => {
  const { language, isRTL } = useLanguage();
  const lang = (["en", "fr", "ar"].includes(language) ? language : "fr") as "en" | "fr" | "ar";
  const ui = faqUI[lang];

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openItem, setOpenItem] = useState<number | null>(null);

  const getQ = (item: typeof faqData[number]) => item[`question_${lang}` as const];
  const getA = (item: typeof faqData[number]) => item[`answer_${lang}` as const];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return faqData.filter((item) => {
      if (activeTab !== "all" && item.category !== activeTab) return false;
      if (q && !getQ(item).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeTab, searchQuery, lang]);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqData.map((item) => ({
        "@type": "Question",
        name: getQ(item),
        acceptedAnswer: { "@type": "Answer", text: getA(item) }
      }))
    }),
    [lang]
  );

  return (
    <section
      dir={isRTL ? "rtl" : "ltr"}
      lang={lang}
      aria-labelledby="faq-heading"
      className="bg-white py-16 md:py-24 px-4"
      style={{ color: "#163300" }}
    >
      <div className="mx-auto w-full max-w-[900px]">
        {/* Header */}
        <header className="text-center mb-10">
          <h2
            id="faq-heading"
            className="font-bold text-3xl md:text-4xl mb-4"
            style={{ color: "#163300" }}
          >
            {ui.title}
          </h2>
          <p className="text-lg max-w-[600px] mx-auto" style={{ color: "rgba(22,51,0,0.7)" }}>
            {ui.subtitle}
          </p>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label={ui.title}
          className="flex gap-2 mb-6 overflow-x-auto md:overflow-visible md:flex-wrap md:justify-start scrollbar-none"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2",
                  active ? "font-bold" : "border"
                )}
                style={
                  active
                    ? { backgroundColor: "#9FE870", color: "#163300" }
                    : { backgroundColor: "transparent", color: "#163300", borderColor: "rgba(22,51,0,0.2)" }
                }
              >
                {ui.tabs[tab]}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-full md:max-w-[500px]">
            <Search
              className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none", isRTL ? "right-3" : "left-3")}
              style={{ color: "rgba(22,51,0,0.5)" }}
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ui.searchPlaceholder}
              aria-label={ui.searchPlaceholder}
              className={cn(
                "w-full rounded-xl py-3 bg-white border focus:outline-none focus:ring-2 transition",
                isRTL ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
              )}
              style={{
                borderColor: "rgba(22,51,0,0.2)",
                color: "#163300",
                ["--tw-ring-color" as any]: "rgba(159,232,112,0.2)"
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#9FE870")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(22,51,0,0.2)")}
            />
          </div>
        </div>

        {/* Accordion */}
        <div className="w-full">
          {filtered.length === 0 ? (
            <p className="text-center py-10" style={{ color: "rgba(22,51,0,0.7)" }}>
              {ui.noResults}
            </p>
          ) : (
            filtered.map((item) => {
              const isOpen = openItem === item.id;
              const panelId = `faq-panel-${item.id}`;
              const buttonId = `faq-button-${item.id}`;
              return (
                <div
                  key={item.id}
                  className="border-b transition-colors hover:bg-[rgba(22,51,0,0.03)] rounded-md"
                  style={{ borderColor: "rgba(22,51,0,0.1)" }}
                >
                  <h3>
                    <button
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenItem(isOpen ? null : item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape" && isOpen) setOpenItem(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-4 py-5 px-2 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 rounded-md",
                        isRTL ? "text-right flex-row-reverse" : "text-left"
                      )}
                      style={{ color: "#163300" }}
                    >
                      <span className="flex-1">{getQ(item)}</span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                          isOpen && "rotate-180"
                        )}
                        style={{ color: "#163300" }}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="px-2 pb-5 text-base leading-relaxed motion-safe:animate-accordion-down"
                    style={{ color: "rgba(22,51,0,0.7)" }}
                  >
                    {getA(item)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CTA */}
        <div
          className="mt-16 p-8 rounded-2xl text-center"
          style={{ backgroundColor: "#163300", color: "#FFFFFF" }}
        >
          <p className="text-lg md:text-xl mb-6 flex items-center justify-center gap-2 flex-wrap">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            {ui.cta.text}
          </p>
          <Link
            to="/contact"
            className="inline-block font-bold rounded-xl px-6 py-3 transition-transform duration-200 hover:scale-105 motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2"
            style={{ backgroundColor: "#9FE870", color: "#163300" }}
          >
            {ui.cta.button}
          </Link>
        </div>

        {/* SEO: FAQPage JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </section>
  );
};

export default FAQSection;
