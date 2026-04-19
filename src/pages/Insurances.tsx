import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Insurances = () => {
  const { t } = useLanguage();

  const coverageItems = [
    "insurances.liability",
    "insurances.collision", 
    "insurances.theft",
    "insurances.personalAccident",
    "insurances.roadside"
  ];

  const fundIncludes = [
    "insurances.minorRepairs",
    "insurances.tirePunctures",
    "insurances.batteryIssues",
    "insurances.locksmith"
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t("insurances.title")}
              </h1>
              <p className="text-lg text-muted-foreground">
                {t("insurances.subtitle")}
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">{t("insurances.whatsCovered")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {coverageItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">{t(item)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mb-8 bg-primary/5 border-primary/20">
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle className="text-2xl">{t("insurances.annualFund")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <p className="font-bold mb-2 text-4xl text-justify text-primary">{t("insurances.fundAmount")}</p>
                  <p className="text-muted-foreground text-left">{t("insurances.fundDescription")}</p>
                </div>
                <p className="text-muted-foreground">
                  {t("insurances.fundDetails")}
                </p>
                <div className="bg-background/50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{t("insurances.coverageIncludes")}</strong>
                  </p>
                  <ul className="space-y-2 mt-2">
                    {fundIncludes.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        {t(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                <CardTitle className="text-2xl">{t("insurances.importantNotes")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>• {t("insurances.note1")}</p>
                <p>• {t("insurances.note2")}</p>
                <p>• {t("insurances.note3")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Insurances;
