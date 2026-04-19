import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, BarChart3, CheckCircle, Sparkles, ArrowRight, Award, Target, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Affiliate = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const affiliateFeatures = [
    {
      title: t('affiliatePage.features.highCommissions'),
      description: t('affiliatePage.features.highCommissionsDesc'),
      icon: DollarSign
    },
    {
      title: t('affiliatePage.features.marketingMaterials'),
      description: t('affiliatePage.features.marketingMaterialsDesc'),
      icon: Sparkles
    },
    {
      title: t('affiliatePage.features.realTimeTracking'),
      description: t('affiliatePage.features.realTimeTrackingDesc'),
      icon: BarChart3
    },
    {
      title: t('affiliatePage.features.monthlyPayouts'),
      description: t('affiliatePage.features.monthlyPayoutsDesc'),
      icon: Award
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: t('affiliatePage.steps.signUp'),
      description: t('affiliatePage.steps.signUpDesc')
    },
    {
      step: "2",
      title: t('affiliatePage.steps.getLink'),
      description: t('affiliatePage.steps.getLinkDesc')
    },
    {
      step: "3",
      title: t('affiliatePage.steps.promote'),
      description: t('affiliatePage.steps.promoteDesc')
    },
    {
      step: "4",
      title: t('affiliatePage.steps.earn'),
      description: t('affiliatePage.steps.earnDesc')
    }
  ];

  const stats = [
    {
      icon: Users,
      value: "200+",
      label: t('affiliatePage.stats.activeAffiliates')
    },
    {
      icon: DollarSign,
      value: "15%",
      label: t('affiliatePage.stats.commissionRate')
    },
    {
      icon: TrendingUp,
      value: t('affiliatePage.stats.cookieDuration'),
      label: t('affiliatePage.stats.cookieDurationLabel')
    },
    {
      icon: Award,
      value: t('affiliatePage.stats.payoutsValue'),
      label: t('affiliatePage.stats.payouts')
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-28 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-semibold">
                <Target className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('affiliatePage.badge')}
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
                {t('affiliatePage.heroTitle')} <span className="text-primary">{t('affiliatePage.heroTitleHighlight')}</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-slide-up">
                {t('affiliatePage.heroSubtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-scale-in">
                <Button variant="hero" size="lg" className="text-lg px-8 py-6 shadow-xl" onClick={() => navigate("/affiliate-signup")}>
                  {t('affiliatePage.becomeAffiliate')}
                  <ArrowRight className={`h-5 w-5 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
                <CheckCircle className="w-4 h-4 text-primary" /> {t('affiliatePage.noInvestment')}
                <CheckCircle className={`w-4 h-4 text-primary ${isRTL ? 'mr-4' : 'ml-4'}`} /> {t('affiliatePage.freeMarketing')}
                <CheckCircle className={`w-4 h-4 text-primary ${isRTL ? 'mr-4' : 'ml-4'}`} /> {t('affiliatePage.cookieTracking')}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-16">
              {stats.map((stat, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                    <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('affiliatePage.howItWorksTitle')}</h2>
              <p className="text-muted-foreground text-lg">{t('affiliatePage.howItWorksSubtitle')}</p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {howItWorks.map((item, index) => (
                <Card key={index} className="relative hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4 mx-auto">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2 text-center">{item.title}</h3>
                    <p className="text-muted-foreground text-center text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Affiliate Features */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('affiliatePage.benefitsTitle')}</h2>
                <p className="text-muted-foreground text-lg">{t('affiliatePage.benefitsSubtitle')}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {affiliateFeatures.map((feature, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <feature.icon className="w-10 h-10 text-primary mb-3" />
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Earnings Calculator */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('affiliatePage.earningsTitle')}</h2>
                <p className="text-muted-foreground text-lg">{t('affiliatePage.earningsSubtitle')}</p>
              </div>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground">{t('affiliatePage.avgBookingValue')}</span>
                      <span className="text-2xl font-bold text-foreground">500 DH</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground">{t('affiliatePage.yourCommission')}</span>
                      <span className="text-2xl font-bold text-primary">75 DH</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground">{t('affiliatePage.referralsPerWeek')}</span>
                      <span className="text-3xl font-bold text-primary">750 DH</span>
                    </div>
                    <div className="bg-primary/10 rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">{t('affiliatePage.potentialEarnings')}</p>
                      <p className="text-5xl font-bold text-primary mb-2">750 DH</p>
                      <p className="text-sm text-muted-foreground">{t('affiliatePage.withJustReferrals')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('affiliatePage.ctaTitle')}</h2>
              <p className="text-lg md:text-xl mb-10 opacity-90">
                {t('affiliatePage.ctaSubtitle')}
              </p>
              
              <Button size="lg" variant="secondary" onClick={() => navigate("/affiliate-signup")} className="text-lg py-6 shadow-xl px-[16px]">
                {t('affiliatePage.joinNow')}
                <ArrowRight className={`h-5 w-5 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Button>

              <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm opacity-90 mt-8">
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {t('affiliatePage.noFees')}
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {t('affiliatePage.freeTools')}
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {t('affiliatePage.support247')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Affiliate;
