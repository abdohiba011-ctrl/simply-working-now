import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Bell, Globe, Moon, Shield, Building2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { hasRole, user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingPush, setSavingPush] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isBusiness = hasRole('business');

  // Load saved preferences from DB
  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('push_notifications_enabled, email_notifications_enabled, preferred_language')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        if (typeof data.push_notifications_enabled === 'boolean') {
          setNotifications(data.push_notifications_enabled);
        }
        if (typeof data.email_notifications_enabled === 'boolean') {
          setEmailNotifications(data.email_notifications_enabled);
        }
      }
      setLoaded(true);
    })();
  }, [user]);

  const persistLanguage = async (lang: 'en' | 'fr' | 'ar') => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ preferred_language: lang })
      .eq('user_id', user.id);
  };

  const handleLanguageChange = async (value: string) => {
    const lang = value as 'en' | 'fr' | 'ar';
    setLanguage(lang);
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('user_id', user.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    toast.success(t('success.profileUpdated'));
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
    toast.success(t('success.profileUpdated'));
  };

  const handlePushToggle = async (checked: boolean) => {
    setNotifications(checked);
    if (!user) return;
    setSavingPush(true);
    const { error } = await supabase
      .from('profiles')
      .update({ push_notifications_enabled: checked })
      .eq('user_id', user.id);
    setSavingPush(false);
    if (error) {
      setNotifications(!checked); // revert
      toast.error(error.message);
      return;
    }
    toast.success(t('success.profileUpdated'));
  };

  const handleEmailToggle = async (checked: boolean) => {
    setEmailNotifications(checked);
    if (!user) return;
    setSavingEmail(true);
    const { error } = await supabase
      .from('profiles')
      .update({ email_notifications_enabled: checked })
      .eq('user_id', user.id);
    setSavingEmail(false);
    if (error) {
      setEmailNotifications(!checked); // revert
      toast.error(error.message);
      return;
    }
    toast.success(t('success.profileUpdated'));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="gap-2"
            >
              <ChevronLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('auth.back')}
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t('settings.title')}</h1>
          </div>

          <div className="space-y-6">
            {/* Desktop: 2 columns layout */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Language Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Globe className="h-5 w-5 text-primary" />
                    {t('settings.language')}
                  </CardTitle>
                  <CardDescription>{t('settings.selectLanguage')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-[100]">
                      <SelectItem value="en">{t('settings.english')}</SelectItem>
                      <SelectItem value="fr">{t('settings.french')}</SelectItem>
                      <SelectItem value="ar">{t('settings.arabic')}</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Bell className="h-5 w-5 text-primary" />
                    {t('settings.notifications')}
                  </CardTitle>
                  <CardDescription>{t('settings.pushNotificationsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}>
                      <Label htmlFor="push-notifications" className="text-base">{t('settings.pushNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.pushNotificationsDesc')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingPush && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <Switch
                        id="push-notifications"
                        checked={notifications}
                        onCheckedChange={handlePushToggle}
                        disabled={!loaded || savingPush}
                      />
                    </div>
                  </div>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}>
                      <Label htmlFor="email-notifications" className="text-base">{t('settings.emailNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.emailNotificationsDesc')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingEmail && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={handleEmailToggle}
                        disabled={!loaded || savingEmail}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desktop: 2 columns layout for second row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Appearance */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Moon className="h-5 w-5 text-primary" />
                    {t('settings.appearance')}
                  </CardTitle>
                  <CardDescription>{t('settings.darkModeDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}>
                      <Label htmlFor="dark-mode" className="text-base">{t('settings.darkMode')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.darkModeDesc')}</p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={theme === 'dark'}
                      onCheckedChange={handleDarkModeToggle}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Security */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Shield className="h-5 w-5 text-primary" />
                    {t('settings.security')}
                  </CardTitle>
                  <CardDescription>{t('settings.changePasswordDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/change-password')}
                    className="w-full"
                  >
                    {t('settings.changePassword')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Business Account — only shown to existing business users */}
            {isBusiness && (
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Building2 className="h-5 w-5 text-primary" />
                    {t('settings.businessAccount')}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.businessAccountDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/business-dashboard')}
                    className="w-full"
                  >
                    {t('header.businessDashboard')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
    </div>
  );
};

export default Settings;
