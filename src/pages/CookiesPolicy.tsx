import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CookiesPolicy = () => {
  const { t } = useLanguage();

  const sections = [
    { title: t('cookiesPage.whatAreCookies'), content: t('cookiesPage.whatAreCookiesContent') },
    { title: t('cookiesPage.howWeUseCookies'), content: t('cookiesPage.howWeUseCookiesContent') },
    { title: t('cookiesPage.typesOfCookies'), content: '' },
    { title: t('cookiesPage.thirdPartyCookies'), content: t('cookiesPage.thirdPartyCookiesContent') },
    { title: t('cookiesPage.localStorage'), content: t('cookiesPage.localStorageContent') },
    { title: t('cookiesPage.cookieDuration'), content: t('cookiesPage.cookieDurationContent') },
    { title: t('cookiesPage.managingCookies'), content: t('cookiesPage.managingCookiesContent') },
    { title: t('cookiesPage.policyUpdates'), content: t('cookiesPage.policyUpdatesContent') },
    { title: t('cookiesPage.contactUs'), content: t('cookiesPage.contactUsContent') }
  ];

  const cookieTypes = [
    { title: t('cookiesPage.essentialCookies'), content: t('cookiesPage.essentialCookiesContent') },
    { title: t('cookiesPage.analyticsCookies'), content: t('cookiesPage.analyticsCookiesContent') },
    { title: t('cookiesPage.functionalCookies'), content: t('cookiesPage.functionalCookiesContent') },
    { title: t('cookiesPage.marketingCookies'), content: t('cookiesPage.marketingCookiesContent') }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Cookie className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">{t('cookiesPage.title')}</CardTitle>
            <p className="text-muted-foreground mt-2">{t('cookiesPage.lastUpdated')}: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none p-6 space-y-6">
            {sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-xl font-semibold text-foreground">{index + 1}. {section.title}</h2>
                {section.content ? (
                  <p className="text-muted-foreground">{section.content}</p>
                ) : index === 2 ? (
                  <div className="space-y-4 mt-4">
                    {cookieTypes.map((type, typeIndex) => (
                      <div key={typeIndex}>
                        <h3 className="text-lg font-medium text-foreground">{type.title}</h3>
                        <p className="text-muted-foreground">{type.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default CookiesPolicy;
