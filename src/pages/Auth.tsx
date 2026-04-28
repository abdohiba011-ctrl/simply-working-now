import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { signupSchema, loginSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { safeGetItem } from "@/lib/safeStorage";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { PrivacyTermsModal } from "@/components/PrivacyTermsModal";
import { getUserFriendlyError, getErrMsg } from "@/lib/errorMessages";
import { playSuccessSound } from "@/lib/soundEffects";
import { useLanguage } from "@/contexts/LanguageContext";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, signup, isAuthenticated, isLoading: authLoading, hasRole } = useAuth();
  const isSignup = searchParams.get("mode") === "signup";
  const returnUrl = searchParams.get("returnUrl");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"client" | "business">("client");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Email verification for signup
  const [signupStep, setSignupStep] = useState<"details" | "verify">("details");
  const [emailOtp, setEmailOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  
  // Privacy/Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);



  // Check if user needs phone number after login
  // Only show phone modal if: no phone AND not verified AND not pending verification
  const checkPhoneRequired = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, is_verified, verification_status')
      .eq('user_id', user.id)
      .single();
    
    // Don't show phone modal if user already has phone, is verified, or is pending verification
    if (profile?.phone) return false;
    if (profile?.is_verified) return false;
    if (profile?.verification_status === 'pending_review') return false;
    
    return true;
  };

  // Redirect if already authenticated - wait for auth to be ready
  useEffect(() => {
    // Wait for auth loading to complete before redirecting
    if (authLoading) return;
    
    if (isAuthenticated) {
      // Check for pending booking first
      const pendingBooking = safeGetItem<unknown>('pendingBooking', null);
      
      if (returnUrl) {
        navigate(returnUrl);
      } else if (pendingBooking) {
        navigate('/booking-review');
      } else if (hasRole('business')) {
        navigate("/business-dashboard");
      } else {
        navigate("/");
      }
    }
  }, [authLoading, isAuthenticated, hasRole, navigate, returnUrl]);

  // Email + password flow only — no OAuth interstitial.


  const handleSendEmailOtp = async () => {
    setOtpSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-email-verification', {
        body: { email: email.toLowerCase().trim(), action: 'send' }
      });
      
      if (error) throw error;
      
      toast.success(t('auth.codeSentSuccess'));
      setSignupStep("verify");
    } catch (error: unknown) {
      console.error('Send OTP error:', error);
      toast.error(getErrMsg(error) || t('auth.failedToSendCode'));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { email: email.toLowerCase().trim(), otp: emailOtp, action: 'verify' }
      });
      
      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(t('auth.invalidOrExpiredCode'));
      }
      
      return true;
    } catch (error: unknown) {
      console.error('Verify OTP error:', error);
      toast.error(getErrMsg(error) || t('auth.invalidOrExpiredCode'));
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignup) {
        // Check terms acceptance
        if (!termsAccepted) {
          toast.error(t('auth.acceptTermsRequired'));
          setIsLoading(false);
          return;
        }
        
        // Validate signup data first
        const validatedData = signupSchema.parse({
          email,
          password,
          confirmPassword,
          name
        });
        
        // Create account directly (auto-confirm is enabled)
        await signup(
          validatedData.email, 
          validatedData.password, 
          validatedData.name,
          accountType === "business" ? "business" : "user"
        );
        
        toast.success(t('auth.accountCreatedSuccess'));
        
        // Navigate to home or return URL
        navigate(returnUrl || '/');
      } else {
        // Validate login data
        const validatedData = loginSchema.parse({
          email,
          password
        });
        
        // Login
        await login(validatedData.email, validatedData.password, rememberMe);
        
        // Play success sound on login
        playSuccessSound();
        
        toast.success(t('auth.loggedInSuccess'));
        
        // Check for pending booking
        const pendingBooking = safeGetItem<unknown>('pendingBooking', null);
        const redirectTo = returnUrl || (pendingBooking ? '/booking-review' : '/');
        
        // Check if phone number is required - redirect to verification page
        const needsPhone = await checkPhoneRequired();
        if (needsPhone) {
          navigate('/verification');
        } else {
          navigate(redirectTo);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Show first validation error
        toast.error(error.errors[0].message);
      } else {
        // Use user-friendly error messages
        toast.error(getUserFriendlyError(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot-password / reset is handled by the dedicated /forgot-password
  // page (6-digit OTP flow). The button on this page just redirects there.



  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {isSignup && signupStep === "verify" ? (
              // Email OTP Verification Step
              <Card>
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      {t('auth.verifyYourEmail')}
                    </h1>
                    <p className="text-muted-foreground">
                      {t('auth.codeSentToEmail')} <strong>{email}</strong>
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-otp">{t('auth.verificationCode')}</Label>
                      <Input
                        id="email-otp"
                        type="text"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
                        required
                        placeholder={t('auth.enterSixDigitCode')}
                        maxLength={6}
                        className="text-center text-2xl tracking-widest font-bold"
                        autoComplete="one-time-code"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        variant="hero"
                        disabled={isLoading || emailOtp.length !== 6}
                      >
                        {isLoading ? t('auth.verifying') : t('auth.verifyAndCreate')}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setSignupStep("details");
                          setEmailOtp("");
                        }}
                        disabled={isLoading}
                      >
                        {t('auth.back')}
                      </Button>
                    </div>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm"
                        onClick={handleSendEmailOtp}
                        disabled={otpSending}
                      >
                        {otpSending ? t('auth.sending') : t('auth.resendCode')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      {isSignup ? t('auth.createAccount') : t('auth.welcomeBack')}
                    </h1>
                  </div>



                   <form onSubmit={handleSubmit} className="space-y-4">
                     {isSignup && (
                       <>
                        
                        <div className="space-y-2">
                          <Label htmlFor="name">{t('auth.fullName')}</Label>
                          <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder={t('auth.enterYourName')}
                            autoComplete="name"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder={t('auth.enterYourEmail')}
                        autoComplete="email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder={t('auth.enterYourPassword')}
                          className="pr-10"
                          autoComplete={isSignup ? "new-password" : "current-password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {isSignup && <PasswordStrengthIndicator password={password} />}
                    </div>
                    
                    {!isSignup && (
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors">
                        <Checkbox
                          id="rememberMe"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="h-5 w-5"
                        />
                        <Label htmlFor="rememberMe" className="text-base font-medium cursor-pointer">
                          {t('auth.rememberMe')}
                        </Label>
                      </div>
                    )}
                    
                    {isSignup && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              placeholder={t('auth.confirmYourPassword')}
                              className="pr-10"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {confirmPassword && password !== confirmPassword && (
                            <p className="text-xs text-destructive">{t('auth.passwordsDoNotMatch')}</p>
                          )}
                          {confirmPassword && password === confirmPassword && password.length > 0 && (
                            <p className="text-xs text-green-600">{t('auth.passwordsMatch')}</p>
                          )}
                        </div>

                        {/* Privacy Policy & Terms Checkbox */}
                        <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
                          <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                            className="mt-0.5"
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor="terms"
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {t('auth.agreeToTerms')}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {t('auth.agreeToTermsDesc')}{" "}
                              <button
                                type="button"
                                onClick={() => setShowTermsModal(true)}
                                className="text-muted-foreground underline hover:text-foreground"
                              >
                                {t('auth.termsOfService')}
                              </button>
                              {" "}{t('auth.and')}{" "}
                              <button
                                type="button"
                                onClick={() => setShowPrivacyModal(true)}
                                className="text-muted-foreground underline hover:text-foreground"
                              >
                                {t('auth.privacyPolicy')}
                              </button>
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                    
                     <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg" 
                      variant="hero"
                      disabled={isLoading || otpSending || (isSignup && !termsAccepted)}
                    >
                      {isLoading || otpSending ? t('auth.pleaseWait') : (isSignup ? t('auth.continue') : t('auth.login'))}
                    </Button>

                    {!isSignup && (
                      <>
                        <div className="text-center">
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 text-sm text-primary hover:underline"
                            onClick={() => navigate("/renter/forgot-password")}
                          >
                            {t('auth.forgotPassword')}
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                  
                  <div className="mt-6 text-center">
                    <p className="text-muted-foreground">
                      {isSignup ? t('auth.haveAccount') : t('auth.noAccount')}{" "}
                      <button
                        onClick={() => navigate(isSignup ? "/auth" : "/auth?mode=signup")}
                        className="text-primary font-semibold hover:underline"
                      >
                        {isSignup ? t('auth.logIn') : t('auth.signUp')}
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Privacy Policy Modal */}
      <PrivacyTermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => {
          setShowPrivacyModal(false);
          setTermsAccepted(true);
        }}
        type="privacy"
      />

      {/* Terms of Service Modal */}
      <PrivacyTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setShowTermsModal(false);
          setTermsAccepted(true);
        }}
        type="terms"
      />
    </div>
  );
};

export default Auth;
