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
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp" | "password">("email");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  // Email verification for signup
  const [signupStep, setSignupStep] = useState<"details" | "verify">("details");
  const [emailOtp, setEmailOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  
  // Privacy/Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // OAuth diagnostic test state
  const [oauthTesting, setOauthTesting] = useState(false);
  const [oauthTestResult, setOauthTestResult] = useState<string | null>(null);

  // Redirect URI validation: the value we send to OAuth is window.location.origin.
  // Known-good origins are the preview, published, and custom domain URLs.
  // If the current origin is not in this list, the Google OAuth callback will
  // reject the redirect and sign-in will fail.
  const KNOWN_REDIRECT_ORIGINS = [
    "https://id-preview--b7e3539e-235c-4d7c-9935-9015e8ff7015.lovable.app",
    "https://simply-working-now.lovable.app",
    "https://motonita.ma",
    "https://www.motonita.ma",
  ];
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const sentRedirectUri = currentOrigin;
  const isKnownOrigin =
    KNOWN_REDIRECT_ORIGINS.includes(currentOrigin) ||
    /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(currentOrigin) ||
    /^http:\/\/localhost(:\d+)?$/i.test(currentOrigin);
  const redirectUriMismatch = !isKnownOrigin && currentOrigin.length > 0;


  // Check if user needs phone number after login
  // Only show phone modal if: no phone AND not verified AND not pending verification
  const checkPhoneRequired = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, is_verified, verification_status')
      .eq('id', user.id)
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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-password-otp', {
        body: { email: resetEmail, action: 'send' }
      });
      
      if (error) throw error;
      
      toast.success(t('auth.codeSentSuccess'));
      setResetStep("otp");
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || t('auth.failedToSendCode'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-password-otp', {
        body: { email: resetEmail, otp: otpCode, action: 'verify' }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(t('auth.invalidOrExpiredCode'));
      }
      
      toast.success(t('auth.codeVerifiedSuccess'));
      setResetStep("password");
    } catch (error: unknown) {
      console.error('OTP verification error:', error);
      toast.error(getErrMsg(error) || t('auth.invalidOrExpiredCode'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast.error(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('auth.passwordMin8'));
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-password-otp', {
        body: { 
          email: resetEmail, 
          otp: otpCode, 
          newPassword,
          action: 'reset' 
        }
      });
      
      if (error) throw error;
      
      toast.success(t('auth.passwordResetSuccess'));
      setShowForgotPassword(false);
      setResetStep("email");
      setResetEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || t('auth.passwordResetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(getErrMsg(result.error) || t('auth.googleSignInFailed'));
        setIsLoading(false);
        return;
      }
      if (result.redirected) {
        // Browser is redirecting to Google
        return;
      }
      // Tokens received and session set; auth state listener will handle redirect
      playSuccessSound();
      toast.success(t('auth.googleSignInSuccess'));
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || t('auth.googleSignInFailed'));
      setIsLoading(false);
    }
  };

  // Diagnostic test for Google OAuth — surfaces the raw error for debugging
  const handleTestGoogleSignIn = async () => {
    setOauthTestResult(null);
    setOauthTesting(true);
    const started = new Date().toISOString();
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const err = result.error as unknown;
        const details = {
          status: "error",
          startedAt: started,
          message: getErrMsg(err),
          name: (err as { name?: string })?.name,
          stack: (err as { stack?: string })?.stack,
          raw: typeof err === "object" ? JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2) : String(err),
        };
        setOauthTestResult(JSON.stringify(details, null, 2));
        toast.error(`Google OAuth test failed: ${details.message}`);
        return;
      }
      if (result.redirected) {
        setOauthTestResult(JSON.stringify({ status: "redirected", startedAt: started, note: "Browser is redirecting to Google. If you land back here without signing in, check the redirect URI in Google Cloud and Lovable Cloud auth settings." }, null, 2));
        return;
      }
      setOauthTestResult(JSON.stringify({ status: "success", startedAt: started, note: "Tokens received and session set." }, null, 2));
      toast.success("Google OAuth test succeeded");
    } catch (error: unknown) {
      const details = {
        status: "exception",
        startedAt: started,
        message: getErrMsg(error),
        name: (error as { name?: string })?.name,
        stack: (error as { stack?: string })?.stack,
        raw: typeof error === "object" ? JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2) : String(error),
      };
      setOauthTestResult(JSON.stringify(details, null, 2));
      toast.error(`Google OAuth test threw: ${details.message}`);
    } finally {
      setOauthTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {showForgotPassword ? (
              <Card>
                <CardContent className="p-8">
                  {resetStep === "email" && (
                    <>
                      <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
                        {t('auth.resetPassword')}
                      </h1>
                      <p className="text-center text-muted-foreground mb-6">
                        {t('auth.resetPasswordDesc')}
                      </p>
                      
                      <form onSubmit={handleSendOTP} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">{t('auth.email')}</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            placeholder={t('auth.yourEmailPlaceholder')}
                            autoComplete="email"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="submit" 
                            className="flex-1" 
                            disabled={isLoading}
                          >
                            {isLoading ? t('auth.sending') : t('auth.sendVerificationCode')}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowForgotPassword(false);
                              setResetStep("email");
                            }}
                            disabled={isLoading}
                          >
                            {t('auth.cancel')}
                          </Button>
                        </div>
                      </form>
                    </>
                  )}

                  {resetStep === "otp" && (
                    <>
                      <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
                        {t('auth.enterVerificationCode')}
                      </h1>
                      <p className="text-center text-muted-foreground mb-6">
                        {t('auth.codeSentTo')} {resetEmail}
                      </p>
                      
                      <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="otp-code">{t('auth.verificationCode')}</Label>
                          <Input
                            id="otp-code"
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            required
                            placeholder={t('auth.enterCode')}
                            maxLength={8}
                            className="text-center text-2xl tracking-widest font-bold"
                            autoComplete="one-time-code"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="submit" 
                            className="flex-1" 
                            disabled={isLoading || otpCode.length !== 8}
                          >
                            {isLoading ? t('auth.verifying') : t('auth.verify')}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setResetStep("email");
                              setOtpCode("");
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
                            onClick={handleSendOTP}
                            disabled={isLoading}
                          >
                            {t('auth.resendCode')}
                          </Button>
                        </div>
                      </form>
                    </>
                  )}

                  {resetStep === "password" && (
                    <>
                      <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
                        {t('auth.createNewPassword')}
                      </h1>
                      <p className="text-center text-muted-foreground mb-6">
                        {t('auth.enterNewPassword')}
                      </p>
                      
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              placeholder={t('auth.enterNewPasswordPlaceholder')}
                              className="pr-10"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <PasswordStrengthIndicator password={newPassword} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-new-password">{t('auth.confirmNewPassword')}</Label>
                          <div className="relative">
                            <Input
                              id="confirm-new-password"
                              type={showConfirmNewPassword ? "text" : "password"}
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              required
                              placeholder={t('auth.confirmNewPasswordPlaceholder')}
                              className="pr-10"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {confirmNewPassword && newPassword !== confirmNewPassword && (
                            <p className="text-xs text-destructive">{t('auth.passwordsDoNotMatch')}</p>
                          )}
                          {confirmNewPassword && newPassword === confirmNewPassword && (
                            <p className="text-xs text-green-600">{t('auth.passwordsMatch')}</p>
                          )}
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isLoading}
                        >
                          {isLoading ? t('auth.resetting') : t('auth.resetPasswordBtn')}
                        </Button>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : isSignup && signupStep === "verify" ? (
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
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

                  {/* Account type segmented switcher */}
                  <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => setAccountType("client")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                        accountType === "client"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-base">🏍️</span>
                      <span>{t('auth.imAClient')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("business")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                        accountType === "business"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-base">💼</span>
                      <span>{t('auth.imABusiness')}</span>
                    </button>
                  </div>
                  
                  {/* Google Sign-In */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    aria-label={isSignup ? t('auth.signUpWithGoogle') : t('auth.continueWithGoogle')}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {isSignup ? t('auth.signUpWithGoogle') : t('auth.continueWithGoogle')}
                  </Button>

                  {redirectUriMismatch && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Redirect URI mismatch</AlertTitle>
                      <AlertDescription>
                        <p className="mb-2">
                          The current page origin does not match any of the redirect URIs
                          authorized for Google sign-in. Google will reject the OAuth callback.
                        </p>
                        <p className="text-xs">
                          <strong>Current origin (sent as redirect_uri):</strong>{" "}
                          <code className="break-all">{sentRedirectUri || "(unknown)"}</code>
                        </p>
                        <p className="text-xs mt-1">
                          <strong>Authorized origins:</strong>{" "}
                          <code className="break-all">{KNOWN_REDIRECT_ORIGINS.join(", ")}</code>
                        </p>
                        <p className="text-xs mt-2">
                          Open this app from one of the authorized URLs, or add the current
                          origin to the Authorized redirect URIs in your Google Cloud OAuth
                          client and to Lovable Cloud auth settings.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWithEmail')}</span>
                    </div>
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
                            onClick={() => setShowForgotPassword(true)}
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
