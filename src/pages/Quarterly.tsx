import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Bike, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Quarterly = () => {
  const { t } = useLanguage();

  const quarters = [
    {
      quarter: "Q4 2024",
      stats: [
        { icon: Users, labelKey: "quarterly.activeUsers", value: "1,250", growth: "+45%" },
        { icon: Bike, labelKey: "quarterly.totalBookings", value: "3,420", growth: "+38%" },
        { icon: DollarSign, labelKey: "quarterly.revenue", value: "245K MAD", growth: "+52%" },
      ]
    },
    {
      quarter: "Q3 2024",
      stats: [
        { icon: Users, labelKey: "quarterly.activeUsers", value: "863", growth: "+32%" },
        { icon: Bike, labelKey: "quarterly.totalBookings", value: "2,480", growth: "+28%" },
        { icon: DollarSign, labelKey: "quarterly.revenue", value: "161K MAD", growth: "+41%" },
      ]
    },
    {
      quarter: "Q2 2024",
      stats: [
        { icon: Users, labelKey: "quarterly.activeUsers", value: "654", growth: "+65%" },
        { icon: Bike, labelKey: "quarterly.totalBookings", value: "1,936", growth: "+72%" },
        { icon: DollarSign, labelKey: "quarterly.revenue", value: "114K MAD", growth: "+68%" },
      ]
    },
    {
      quarter: "Q1 2024",
      stats: [
        { icon: Users, labelKey: "quarterly.activeUsers", value: "396", growth: t("quarterly.launch") },
        { icon: Bike, labelKey: "quarterly.totalBookings", value: "1,125", growth: t("quarterly.launch") },
        { icon: DollarSign, labelKey: "quarterly.revenue", value: "68K MAD", growth: t("quarterly.launch") },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4 rtl-flip" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t("quarterly.title")}
              </h1>
              <p className="text-lg text-muted-foreground">
                {t("quarterly.subtitle")}
              </p>
            </div>

            <div className="space-y-8">
              {quarters.map((quarter, index) => (
                <Card key={index} className="hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">{quarter.quarter}</CardTitle>
                      <Badge variant="secondary">{t("quarterly.report")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      {quarter.stats.map((stat, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <stat.icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">{t(stat.labelKey)}</p>
                            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            <Badge variant="secondary" className="mt-1">{stat.growth}</Badge>
                          </div>
                        </div>
                      ))}
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

export default Quarterly;
