import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

export const FAQSection = () => {
  const { t } = useLanguage();

  const faqs = [
    {
      question: t('faqItems.q1'),
      answer: t('faqItems.a1')
    },
    {
      question: t('faqItems.q2'),
      answer: t('faqItems.a2')
    },
    {
      question: t('faqItems.q3'),
      answer: t('faqItems.a3')
    },
    {
      question: t('faqItems.q4'),
      answer: t('faqItems.a4')
    },
    {
      question: t('faqItems.q5'),
      answer: t('faqItems.a5')
    },
    {
      question: t('faqItems.q6'),
      answer: t('faqItems.a6')
    },
    {
      question: t('faqItems.q7'),
      answer: t('faqItems.a7')
    },
    {
      question: t('faqItems.q8'),
      answer: t('faqItems.a8')
    }
  ];

  return (
    <section className="py-20 bg-background" aria-label={t('faq.title')}>
      <div className="container mx-auto px-4 max-w-4xl">
        <header className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('faq.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('faq.subtitle')}
          </p>
        </header>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b border-border">
              <AccordionTrigger className="text-left hover:text-foreground transition-colors py-4 text-base md:text-lg font-semibold text-foreground">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4 text-sm md:text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* FAQ Structured Data */}
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            })
          }}
        />
      </div>
    </section>
  );
};
