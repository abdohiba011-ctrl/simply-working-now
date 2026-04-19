import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PrivacyPolicy = () => {
  const { t } = useLanguage();

  const sections = [
    { title: t('privacyPage.introduction'), content: t('privacyPage.introductionContent') },
    { title: t('privacyPage.informationCollected'), content: t('privacyPage.informationCollectedContent') },
    { title: t('privacyPage.howWeUse'), content: t('privacyPage.howWeUseContent') },
    { title: t('privacyPage.dataSecurity'), content: t('privacyPage.dataSecurityContent') },
    { title: t('privacyPage.dataSharing'), content: t('privacyPage.dataSharingContent') },
    { title: t('privacyPage.yourRights'), content: t('privacyPage.yourRightsContent') },
    { title: t('privacyPage.dataRetention'), content: t('privacyPage.dataRetentionContent') },
    { title: t('privacyPage.cookies'), content: t('privacyPage.cookiesContent') },
    { title: t('privacyPage.childrensPrivacy'), content: t('privacyPage.childrensPrivacyContent') },
    { title: t('privacyPage.policyChanges'), content: t('privacyPage.policyChangesContent') },
    { title: t('privacyPage.contactUs'), content: t('privacyPage.contactUsContent') }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">{t('privacyPage.title')}</CardTitle>
            <p className="text-muted-foreground mt-2">{t('privacyPage.lastUpdated')}: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none p-6 space-y-6">
            {sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-xl font-semibold text-foreground">{index + 1}. {section.title}</h2>
                <p className="text-muted-foreground">{section.content}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
