import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Shield, Clock, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const GPSTracking = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: MapPin,
      titleKey: "gpsTracking.realTimeLocation",
      descriptionKey: "gpsTracking.realTimeLocationDesc"
    },
    {
      icon: Shield,
      titleKey: "gpsTracking.theftProtection",
      descriptionKey: "gpsTracking.theftProtectionDesc"
    },
    {
      icon: Clock,
      titleKey: "gpsTracking.tripHistory",
      descriptionKey: "gpsTracking.tripHistoryDesc"
    },
    {
      icon: Bell,
      titleKey: "gpsTracking.alerts",
      descriptionKey: "gpsTracking.alertsDesc"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t("gpsTracking.title")} <span className="text-destructive">{t("gpsTracking.comingSoon")}</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                {t("gpsTracking.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {features.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <feature.icon className="w-10 h-10 text-primary mb-3" />
                    <CardTitle>{t(feature.titleKey)}</CardTitle>
                    <CardDescription className="text-base">{t(feature.descriptionKey)}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle className="text-2xl">{t("gpsTracking.howItWorks")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t("gpsTracking.paragraph1")}</p>
                <p>{t("gpsTracking.paragraph2")}</p>
                <p>{t("gpsTracking.paragraph3")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default GPSTracking;
