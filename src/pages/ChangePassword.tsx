import { useState, useMemo } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Lock, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Show/hide password states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password requirements validation
  const requirements = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    };
  }, [newPassword]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const score = Object.values(requirements).filter(Boolean).length;
    
    if (score === 0) return { level: 'none', color: 'bg-muted', width: 0, label: '' };
    if (score <= 2) return { level: 'weak', color: 'bg-red-500', width: 33, label: t('common.error') };
    if (score <= 4) return { level: 'medium', color: 'bg-yellow-500', width: 66, label: t('common.warning') };
    return { level: 'strong', color: 'bg-green-500', width: 100, label: t('common.success') };
  }, [requirements, t]);

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error(t('auth.password'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('errors.passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('errors.passwordTooShort'));
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password.');
      return;
    }

    try {
      setIsLoading(true);

      // 1. Verify current password by attempting a sign-in with it.
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error('No active session.');

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        toast.error('Current password is incorrect.');
        setIsLoading(false);
        return;
      }

      // 2. Update to new password.
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(t('success.passwordChanged'));
      navigate('/profile');
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      toast.error(getErrMsg(error) || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-muted-foreground'} ${isRTL ? 'flex-row-reverse' : ''}`}>
      {met ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings')}
              className="gap-2"
            >
              <ChevronLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('auth.back')}
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t('settings.changePassword')}</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Lock className="h-5 w-5 text-primary" />
                {t('settings.changePassword')}
              </CardTitle>
              <CardDescription className={isRTL ? 'text-right' : ''}>
                {t('settings.changePasswordDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="current-password" className={isRTL ? 'text-right block' : ''}>{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('auth.password')}
                      className={`${isRTL ? 'pl-10 text-right' : 'pr-10'}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className={isRTL ? 'text-right block' : ''}>{t('auth.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth.newPassword')}
                      className={`${isRTL ? 'pl-10 text-right' : 'pr-10'}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-2 pt-2">
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm text-muted-foreground">{t('common.status')}</span>
                        <span className={`text-sm font-medium ${
                          passwordStrength.level === 'weak' ? 'text-red-500' :
                          passwordStrength.level === 'medium' ? 'text-yellow-500' :
                          passwordStrength.level === 'strong' ? 'text-green-500' : ''
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <Progress 
                        value={passwordStrength.width} 
                        className="h-2"
                        indicatorClassName={passwordStrength.color}
                      />
                    </div>
                  )}

                  {/* Requirements Checklist */}
                  {newPassword && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 p-3 bg-muted/50 rounded-lg">
                      <RequirementItem met={requirements.length} text={t('errors.passwordTooShort')} />
                      <RequirementItem met={requirements.uppercase} text="A-Z" />
                      <RequirementItem met={requirements.lowercase} text="a-z" />
                      <RequirementItem met={requirements.number} text="0-9" />
                      <RequirementItem met={requirements.special} text="!@#$" />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className={isRTL ? 'text-right block' : ''}>{t('auth.confirmNewPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.confirmNewPassword')}
                      className={`${isRTL ? 'pl-10 text-right' : 'pr-10'} ${passwordsMatch ? 'border-green-500 focus-visible:ring-green-500' : ''} ${passwordsMismatch ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Match Indicator */}
                  {confirmPassword && (
                    <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-500'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {passwordsMatch ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>{t('common.success')}</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          <span>{t('errors.passwordMismatch')}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/settings')}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={isLoading || !passwordsMatch || passwordStrength.level === 'weak'}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.loading')}
                      </>
                    ) : (
                      t('settings.changePassword')
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      
    </div>
  );
};

export default ChangePassword;
