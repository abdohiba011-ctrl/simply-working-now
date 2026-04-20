import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, MapPin, Star, Phone, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Fixers = () => {
  const { t } = useLanguage();

  const fixers = [
    {
      name: "Hassan Mécanique",
      specialty: "fixers.engineRepair",
      location: "Maarif, Casablanca",
      phone: "+212 600 111 222",
      rating: 4.9,
      responseTime: "30 min",
      verified: true,
    },
    {
      name: "Atelier Karim",
      specialty: "fixers.tirePuncture",
      location: "Ain Diab, Casablanca",
      phone: "+212 600 333 444",
      rating: 4.8,
      responseTime: "20 min",
      verified: true,
    },
    {
      name: "Moto Fix Anfa",
      specialty: "fixers.electricalBattery",
      location: "Anfa, Casablanca",
      phone: "+212 600 555 666",
      rating: 4.9,
      responseTime: "25 min",
      verified: true,
    },
    {
      name: "Rapid Repair Bouskoura",
      specialty: "fixers.brakesGears",
      location: "Bouskoura, Casablanca",
      phone: "+212 600 777 888",
      rating: 4.7,
      responseTime: "35 min",
      verified: true,
    },
    {
      name: "Pro Mécano Derb Sultan",
      specialty: "fixers.generalMaintenance",
      location: "Derb Sultan, Casablanca",
      phone: "+212 600 999 000",
      rating: 4.8,
      responseTime: "40 min",
      verified: true,
    },
    {
      name: "Speed Fix Mediouna",
      specialty: "fixers.roadsideAssistance",
      location: "Tet Mellil, Mediouna",
      phone: "+212 600 121 314",
      rating: 4.9,
      responseTime: "45 min",
      verified: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t("fixers.title")}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("fixers.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fixers.map((fixer, index) => (
                <Card key={index} className="hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-primary" />
                      </div>
                      {fixer.verified && (
                        <Badge variant="secondary">{t("fixers.verified")}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{fixer.name}</CardTitle>
                    <p className="text-sm text-primary font-medium">{t(fixer.specialty)}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{fixer.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm" dir="ltr">{fixer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {t("fixers.responseTime")}: {fixer.responseTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="font-semibold">{fixer.rating}</span>
                      <span className="text-muted-foreground text-sm">
                        {t("fixers.rating")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Fixers;
