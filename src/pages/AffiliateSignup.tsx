import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { UserPlus, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const AffiliateSignup = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          message: "I want to join the affiliate program at Motori.ma",
          type: 'affiliate'
        }
      });

      if (error) throw error;

      // Navigate to thank you page
      navigate("/thank-you?type=affiliate");
    } catch (error: unknown) {
      console.error("Error submitting application:", error);
      toast.error(t("affiliateSignup.submitError"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <UserPlus className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t("affiliateSignup.title")}
              </h1>
              <p className="text-lg text-muted-foreground">
                {t("affiliateSignup.subtitle")}
              </p>
            </div>

            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">{t("affiliateSignup.formTitle")}</CardTitle>
                <CardDescription>
                  {t("affiliateSignup.formDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-sm font-semibold">
                      <User className="h-4 w-4 text-foreground" />
                      {t("affiliateSignup.fullName")}
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t("affiliateSignup.fullNamePlaceholder")}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="min-h-[48px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold">
                      <Mail className="h-4 w-4 text-foreground" />
                      {t("affiliateSignup.email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("affiliateSignup.emailPlaceholder")}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="min-h-[48px] ltr-input"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold">
                      <Phone className="h-4 w-4 text-foreground" />
                      {t("affiliateSignup.phone")}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t("affiliateSignup.phonePlaceholder")}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="min-h-[48px] ltr-input"
                      dir="ltr"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[52px] text-lg font-semibold"
                  >
                    {isSubmitting ? t("affiliateSignup.submitting") : t("affiliateSignup.submitButton")}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    {t("affiliateSignup.consentText")}
                  </p>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8 p-6 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-foreground mb-3">{t("affiliateSignup.whatHappensNext")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  {t("affiliateSignup.step1")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  {t("affiliateSignup.step2")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  {t("affiliateSignup.step3")}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  {t("affiliateSignup.step4")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AffiliateSignup;
