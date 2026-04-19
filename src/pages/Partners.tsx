import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Partners = () => {
  const { t } = useLanguage();

  const partners = [
    {
      name: "Mediouna Tet Mellil",
      location: "Tet Mellil, Mediouna",
      rating: 4.9,
      bikes: 35,
      verified: true
    },
    {
      name: "Bouskoura Rentals",
      location: "Bouskoura, Casablanca",
      rating: 4.8,
      bikes: 28,
      verified: true
    },
    {
      name: "Anfa Rentals Shop",
      location: "Anfa, Casablanca",
      rating: 4.9,
      bikes: 32,
      verified: true
    },
    {
      name: "Derb Sultan Rentals",
      location: "Derb Sultan, Casablanca",
      rating: 4.7,
      bikes: 25,
      verified: true
    },
    {
      name: "Ain Diab Rentals",
      location: "Ain Diab, Casablanca",
      rating: 4.8,
      bikes: 30,
      verified: true
    },
    {
      name: "Maarif Rentals",
      location: "Maarif, Casablanca",
      rating: 4.9,
      bikes: 40,
      verified: true
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-center">
              {t("partners.title")}
            </h1>
            <p className="text-lg text-muted-foreground text-center mb-12">
              {t("partners.subtitle")}
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {partners.map((partner, index) => (
                <Card key={index} className="hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      {partner.verified && (
                        <Badge variant="secondary">{t("partners.verified")}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{partner.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{partner.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="font-semibold">{partner.rating}</span>
                      <span className="text-muted-foreground">{t("partners.rating")}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {partner.bikes} {t("partners.bikesAvailable")}
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

export default Partners;
