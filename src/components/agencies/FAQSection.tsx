import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  ["Is it really free?", "Yes. During our launch period, agencies pay nothing — no setup fee, no monthly subscription, no listing fee. We make our revenue from a small flat fee charged to renters at booking. You keep 100% of your rental price."],
  ["How does payment work?", "Renters pay a 60 MAD booking fee to Motonita upfront via card or Cash Plus. At pickup, the renter pays you directly for the rental (rental price minus 50 MAD that we already collected) plus a refundable deposit. You handle the deposit like you always have."],
  ["What about insurance and deposits?", "You handle deposits and insurance the same way you do today. Motonita is a booking platform — we connect you with renters, but the rental relationship is between you and the renter."],
  ["What if a renter doesn't show up?", "Report the no-show. The renter is automatically banned after 2 no-shows. You don't lose anything — they prepaid 60 MAD which we keep."],
  ["Can I list my whole fleet?", "Yes, unlimited bikes. No limits."],
  ["When do paid plans start?", "Not yet. We're focused on growing the marketplace first. When we do introduce paid features later, existing agencies get advance notice and grandfathered benefits."],
  ["Is my agency verified before bikes go live?", "Yes. We verify every agency's RC, ICE, and CIN before bikes appear publicly. This protects renters and builds trust in the platform."],
];

export const FAQSection = () => (
  <section className="bg-white py-20 sm:py-24 px-6">
    <div className="mx-auto max-w-3xl">
      <h2 className="text-3xl sm:text-4xl font-bold text-[#163300] text-center mb-12">
        Common questions
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map(([q, a], i) => (
          <AccordionItem key={i} value={`q-${i}`}>
            <AccordionTrigger className="text-left text-[#163300] font-semibold text-base sm:text-lg">
              {q}
            </AccordionTrigger>
            <AccordionContent className="text-[#4A5568] leading-relaxed text-base">
              {a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);
