import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const OurShops = () => {
  const { t } = useLanguage();

  const shops = [
    {
      name: "Motori Casablanca Central",
      address: "123 Rue Mohammed V, Casablanca",
      phone: "+212 600 111 222",
      hours: "8:00 AM - 8:00 PM",
      bikes: 25
    },
    {
      name: "Motori Marrakech",
      address: "45 Avenue Hassan II, Marrakech",
      phone: "+212 600 333 444",
      hours: "8:00 AM - 8:00 PM",
      bikes: 20
    },
    {
      name: "Motori Rabat",
      address: "78 Boulevard Al Massira, Rabat",
      phone: "+212 600 555 666",
      hours: "8:00 AM - 8:00 PM",
      bikes: 18
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-center">
              {t("ourShops.title")} <span className="text-destructive">{t("ourShops.comingSoon")}</span>
            </h1>
            <p className="text-lg text-muted-foreground text-center mb-12">
              {t("ourShops.subtitle")}
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map((shop, index) => (
                <Card key={index} className="hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <Badge className="w-fit mb-2">{t("ourShops.officialShop")}</Badge>
                    <CardTitle className="text-xl">{shop.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{shop.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm" dir="ltr">{shop.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{shop.hours}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm font-semibold text-primary">
                        {shop.bikes} {t("ourShops.bikesAvailable")}
                      </p>
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

export default OurShops;
