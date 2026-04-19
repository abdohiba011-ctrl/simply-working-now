import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, Shield, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const { t } = useLanguage();

  const values = [
    {
      icon: Target,
      title: t('aboutPage.ourMission'),
      description: t('aboutPage.ourMissionDesc')
    },
    {
      icon: Users,
      title: t('aboutPage.communityFirst'),
      description: t('aboutPage.communityFirstDesc')
    },
    {
      icon: Shield,
      title: t('aboutPage.safetySecurity'),
      description: t('aboutPage.safetySecurityDesc')
    },
    {
      icon: Heart,
      title: t('aboutPage.customerSatisfaction'),
      description: t('aboutPage.customerSatisfactionDesc')
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-center">
              {t('aboutPage.title')}
            </h1>
            
            <div className="prose prose-lg max-w-none mb-16">
              <p className="text-lg text-muted-foreground text-center mb-8">
                {t('aboutPage.subtitle')}
              </p>
              
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">{t('aboutPage.ourStory')}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('aboutPage.ourStoryContent')}
                  </p>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {values.map((value, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <value.icon className="w-10 h-10 text-primary mb-3" />
                      <CardTitle>{value.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
