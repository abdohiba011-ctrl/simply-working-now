import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const Contact = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [honeypot, setHoneypot] = useState(""); // Anti-spam honeypot field
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "name":
        if (!value.trim()) return t('errors.fieldRequired');
        if (value.trim().length < 2) return t('errors.fieldRequired');
        return "";
      case "email":
        if (!value.trim()) return t('errors.fieldRequired');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('errors.invalidEmail');
        return "";
      case "message":
        if (!value.trim()) return t('errors.fieldRequired');
        if (value.trim().length < 10) return t('errors.fieldRequired');
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    setTouched({ name: true, email: true, message: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(t('errors.generic'));
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Save to database first
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          type: 'contact',
          status: 'unread'
        });

      if (dbError) {
        console.error("Database error:", dbError);
        // Continue with email sending even if db fails
      }

      // Send email with honeypot field
      const { error: emailError } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          email: formData.email,
          message: formData.message,
          type: 'contact',
          honeypot: honeypot // Include honeypot for spam detection
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Still show success if db worked
        if (!dbError) {
          toast.success(t('success.messageSent'));
          navigate("/thank-you?type=contact");
          return;
        }
        throw emailError;
      }

      toast.success(t('success.messageSent'));
      navigate("/thank-you?type=contact");
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      toast.error(t('errors.generic'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className={`text-4xl md:text-5xl font-bold text-foreground mb-4 text-center ${isRTL ? 'font-arabic' : ''}`}>
              {t('contact.title')}
            </h1>
            <p className={`text-lg text-muted-foreground text-center mb-12 ${isRTL ? 'font-arabic' : ''}`}>
              {t('contact.subtitle')}
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <Mail className="w-8 h-8 text-primary mb-2" />
                    <CardTitle>{t('profile.email')}</CardTitle>
                    <CardDescription>contact@motori.ma</CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <Phone className="w-8 h-8 text-primary mb-2" />
                    <CardTitle>{t('profile.phone')}</CardTitle>
                    <CardDescription>07 10 56 44 76</CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <MapPin className="w-8 h-8 text-primary mb-2" />
                    <CardTitle>{t('profile.address')}</CardTitle>
                    <CardDescription>{t('cityNames.casablanca')}, Morocco</CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <MessageCircle className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>{t('contact.title')}</CardTitle>
                  <CardDescription>{t('contact.successDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Honeypot field - hidden from humans, filled by bots */}
                    <div 
                      style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} 
                      aria-hidden="true"
                    >
                      <Input 
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        placeholder="Leave this field empty"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground">
                        {t('contact.name')} <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="name"
                        placeholder={t('contact.name')} 
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        onBlur={() => handleBlur("name")}
                        className={`${errors.name && touched.name ? "border-destructive" : ""} ${isRTL ? 'text-right' : ''}`}
                      />
                      {errors.name && touched.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground">
                        {t('contact.email')} <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="email"
                        type="email" 
                        placeholder={t('contact.email')} 
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        onBlur={() => handleBlur("email")}
                        className={`${errors.email && touched.email ? "border-destructive" : ""} ${isRTL ? 'text-right' : ''}`}
                      />
                      {errors.email && touched.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-foreground">
                        {t('contact.message')} <span className="text-destructive">*</span>
                      </Label>
                      <Textarea 
                        id="message"
                        placeholder={t('contact.message')} 
                        rows={5} 
                        maxLength={1000}
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        onBlur={() => handleBlur("message")}
                        className={`${errors.message && touched.message ? "border-destructive" : ""} ${isRTL ? 'text-right' : ''}`}
                      />
                      <div className="flex justify-between items-center">
                        {errors.message && touched.message ? (
                          <p className="text-sm text-destructive">{errors.message}</p>
                        ) : (
                          <span />
                        )}
                        <p className={`text-sm ${formData.message.length > 900 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {formData.message.length}/1000
                        </p>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? t('contact.sending') : t('contact.send')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;
