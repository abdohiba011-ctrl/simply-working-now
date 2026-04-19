import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Sparkles, Calendar, Bike } from "lucide-react";

const Pricing = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: tiers, isLoading } = usePricingTiers();

  // Calculate example totals for each tier
  const getExampleTotal = (dailyPrice: number, minDays: number) => {
    const exampleDays = minDays === 30 ? 30 : minDays === 15 ? 15 : minDays === 7 ? 7 : minDays === 3 ? 3 : 1;
    return dailyPrice * exampleDays;
  };

  // Get savings compared to daily rate
  const getSavings = (tierPrice: number, minDays: number, dailyPrice: number) => {
    if (minDays <= 1) return 0;
    return Math.round(((dailyPrice - tierPrice) / dailyPrice) * 100);
  };

  const dailyPrice = tiers?.find(t => t.tier_key === 'daily')?.daily_price || 99;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4">
              {t('pricingPage.badge')}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              {t('pricingPage.title')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('pricingPage.subtitle')}
            </p>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="relative">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-24 mb-4" />
                      <Skeleton className="h-10 w-32 mb-2" />
                      <Skeleton className="h-4 w-20 mb-6" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {tiers?.map((tier, index) => {
                  const savings = getSavings(tier.daily_price, tier.min_days, dailyPrice);
                  const isBestValue = tier.tier_key === 'one_month';
                  
                  return (
                    <Card 
                      key={tier.id} 
                      className={`relative transition-all hover:shadow-lg ${
                        isBestValue ? 'border-2 border-primary ring-2 ring-primary/20' : ''
                      }`}
                    >
                      {isBestValue && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground gap-1">
                            <Sparkles className="h-3 w-3" />
                            {t('pricingPage.bestValue')}
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-6 pt-8">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {t(`pricingPage.tiers.${tier.tier_key}`)}
                        </h3>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-3xl md:text-4xl font-bold text-foreground">
                            {tier.daily_price}
                          </span>
                          <span className="text-muted-foreground text-sm">DH/{t('pricingPage.perDay')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                          {tier.min_days === 1 
                            ? t('pricingPage.daysRange.daily')
                            : tier.max_days 
                              ? t('pricingPage.daysRange.range').replace('{min}', String(tier.min_days)).replace('{max}', String(tier.max_days))
                              : t('pricingPage.daysRange.plus').replace('{min}', String(tier.min_days))
                          }
                        </p>
                        
                        {savings > 0 && (
                          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
                            {t('pricingPage.save')} {savings}%
                          </Badge>
                        )}

                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>{t('pricingPage.features.freeDelivery')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>{t('pricingPage.features.noHiddenFees')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>{t('pricingPage.features.support')}</span>
                          </div>
                        </div>

                        {tier.min_days >= 7 && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                              {t('pricingPage.exampleTotal')}: <span className="font-semibold text-foreground">{getExampleTotal(tier.daily_price, tier.min_days)} DH</span>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Monthly Highlight */}
            <Card className="mt-12 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <Badge variant="secondary" className="mb-3">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t('pricingPage.monthlyDeal.badge')}
                    </Badge>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {t('pricingPage.monthlyDeal.title')}
                    </h2>
                    <p className="text-muted-foreground">
                      {t('pricingPage.monthlyDeal.description')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-primary mb-1">
                      59 DH<span className="text-lg font-normal text-muted-foreground">/{t('pricingPage.perDay')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('pricingPage.monthlyDeal.total')}: <span className="font-bold text-foreground">1,770 DH</span>
                    </p>
                    <Button variant="hero" size="lg" onClick={() => navigate('/listings')}>
                      <Bike className="h-5 w-5 mr-2" />
                      {t('pricingPage.browseBikes')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{t('pricingPage.info.flexible.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('pricingPage.info.flexible.description')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Check className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{t('pricingPage.info.transparent.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('pricingPage.info.transparent.description')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{t('pricingPage.info.automatic.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('pricingPage.info.automatic.description')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t('pricingPage.cta.title')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t('pricingPage.cta.description')}
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate('/listings')}>
              {t('pricingPage.cta.button')}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
