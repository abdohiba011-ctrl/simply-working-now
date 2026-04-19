import { Search, CheckCircle, Key } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const HowItWorksSection = () => {
  const { t } = useLanguage();

  const steps = [
    {
      icon: Search,
      step: "01",
      title: t('howItWorks.step1'),
      description: t('howItWorks.step1Desc'),
    },
    {
      icon: CheckCircle,
      step: "02",
      title: t('howItWorks.step2'),
      description: t('howItWorks.step2Desc'),
    },
    {
      icon: Key,
      step: "03",
      title: t('howItWorks.step3'),
      description: t('howItWorks.step3Desc'),
    },
  ];

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-muted/20" aria-label="How to rent a motorbike">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('howItWorks.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection Lines */}
          <div className="hidden md:block absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="relative group"
              >
                {/* Card */}
                <div className="relative bg-card rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-border hover:border-primary/50 h-full">
                  {/* Step Number Badge */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg group-hover:scale-110 transition-transform z-10">
                    {step.step}
                  </div>
                  
                  {/* Icon Container */}
                  <div className="mt-8 mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-10 w-10 text-foreground" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Hover Effect Arrow */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-border group-hover:text-primary transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
