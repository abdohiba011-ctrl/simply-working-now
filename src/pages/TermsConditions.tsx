import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TermsConditions = () => {
  const { t } = useLanguage();

  const sections = [
    { title: t('termsPage.agreementToTerms'), content: t('termsPage.agreementToTermsContent') },
    { title: t('termsPage.rentalRequirements'), content: t('termsPage.rentalRequirementsContent') },
    { title: t('termsPage.bookingPayment'), content: t('termsPage.bookingPaymentContent') },
    { title: t('termsPage.cancellationPolicy'), content: t('termsPage.cancellationPolicyContent') },
    { title: t('termsPage.renterResponsibilities'), content: t('termsPage.renterResponsibilitiesContent') },
    { title: t('termsPage.damageAndLiability'), content: t('termsPage.damageAndLiabilityContent') },
    { title: t('termsPage.insuranceCoverage'), content: t('termsPage.insuranceCoverageContent') },
    { title: t('termsPage.lateReturns'), content: t('termsPage.lateReturnsContent') },
    { title: t('termsPage.prohibitedUses'), content: t('termsPage.prohibitedUsesContent') },
    { title: t('termsPage.accountTermination'), content: t('termsPage.accountTerminationContent') },
    { title: t('termsPage.disputeResolution'), content: t('termsPage.disputeResolutionContent') },
    { title: t('termsPage.changesToTerms'), content: t('termsPage.changesToTermsContent') },
    { title: t('termsPage.contactUs'), content: t('termsPage.contactUsContent') }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">{t('termsPage.title')}</CardTitle>
            <p className="text-muted-foreground mt-2">{t('termsPage.lastUpdated')}: December 2024</p>
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

export default TermsConditions;
