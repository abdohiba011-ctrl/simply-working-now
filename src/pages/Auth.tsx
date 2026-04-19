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
import { lovable } from "@/integrations/lovable";
import { Checkbox } from "@/components/ui/checkbox";
import { safeGetItem } from "@/lib/safeStorage";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { PrivacyTermsModal } from "@/components/PrivacyTermsModal";
import { getUserFriendlyError, getErrMsg } from "@/lib/errorMessages";
import { playSuccessSound } from "@/lib/soundEffects";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      
      toast.success("Verification code sent to your email!");
      setSignupStep("verify");
    } catch (error: unknown) {
      console.error('Send OTP error:', error);
      toast.error(getErrMsg(error) || "Failed to send verification code. Please try again.");
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
        throw new Error("Invalid verification code");
      }
      
      return true;
    } catch (error: unknown) {
      console.error('Verify OTP error:', error);
      toast.error(getErrMsg(error) || "Invalid or expired verification code");
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
          toast.error("Please accept the Privacy Policy and Terms of Service");
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
        
        toast.success("Account created successfully! Welcome!");
        
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
        
        toast.success("Logged in successfully!");
        
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
      
      toast.success("Verification code sent! Please check your email.");
      setResetStep("otp");
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || "Failed to send verification code. Please try again.");
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
        throw new Error("Invalid or expired verification code");
      }
      
      toast.success("Code verified! Please create a new password.");
      setResetStep("password");
    } catch (error: unknown) {
      console.error('OTP verification error:', error);
      toast.error(getErrMsg(error) || "Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
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
      
      toast.success("Password reset successfully! You can now log in.");
      setShowForgotPassword(false);
      setResetStep("email");
      setResetEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || "Failed to reset password. Please try again.");
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
        toast.error(getErrMsg(result.error) || "Google sign-in failed. Please try again.");
        setIsLoading(false);
        return;
      }
      if (result.redirected) {
        // Browser is redirecting to Google
        return;
      }
      // Tokens received and session set; auth state listener will handle redirect
      playSuccessSound();
      toast.success("Signed in with Google!");
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || "Google sign-in failed. Please try again.");
      setIsLoading(false);
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
                        Reset Password
                      </h1>
                      <p className="text-center text-muted-foreground mb-6">
                        Enter your email address and we'll send you a verification code.
                      </p>
                      
                      <form onSubmit={handleSendOTP} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            placeholder="your@email.com"
                            autoComplete="email"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="submit" 
                            className="flex-1" 
                            disabled={isLoading}
                          >
                            {isLoading ? "Sending..." : "Send Verification Code"}
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
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </>
                  )}

                  {resetStep === "otp" && (
                    <>
                      <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
                        Enter Verification Code
                      </h1>
                      <p className="text-center text-muted-foreground mb-6">
                        We sent an 8-digit code to {resetEmail}
                      </p>
                      
                      <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="otp-code">Verification Code</Label>
                          <Input
                            id="otp-code"
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            required
                            placeholder="Enter 8-digit code"
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
                            {isLoading ? "Verifying..." : "Verify Code"}
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
                            Back
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
                            Resend code
                          </Button>
                        </div>
                      </form>
                    </>
                  )}

                  {resetStep === "password" && (
                    <>
                      <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
                        Create New Password
                      </h1>
                      <p className="text-center text-muted-foreground mb-6">
                        Enter your new password below
                      </p>
                      
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              placeholder="Enter new password"
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
                          <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                          <div className="relative">
                            <Input
                              id="confirm-new-password"
                              type={showConfirmNewPassword ? "text" : "password"}
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              required
                              placeholder="Confirm new password"
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
                            <p className="text-xs text-destructive">Passwords do not match</p>
                          )}
                          {confirmNewPassword && newPassword === confirmNewPassword && (
                            <p className="text-xs text-green-600">Passwords match ✓</p>
                          )}
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Resetting..." : "Reset Password"}
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
                      Verify Your Email
                    </h1>
                    <p className="text-muted-foreground">
                      We sent a 6-digit code to <strong>{email}</strong>
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-otp">Verification Code</Label>
                      <Input
                        id="email-otp"
                        type="text"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        placeholder="Enter 6-digit code"
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
                        {isLoading ? "Verifying..." : "Verify & Create Account"}
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
                        Back
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
                        {otpSending ? "Sending..." : "Resend code"}
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
                      {isSignup ? "Create Account" : "Welcome Back"}
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
                      <span>I'm a Client</span>
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
                      <span>I'm a Business</span>
                    </button>
                  </div>
                  
                  {/* Google Sign-In */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    aria-label={isSignup ? "Sign up with Google" : "Sign in with Google"}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {isSignup ? "Sign up with Google" : "Continue with Google"}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                   <form onSubmit={handleSubmit} className="space-y-4">
                     {isSignup && (
                       <>
                        
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Enter your name"
                            autoComplete="name"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email"
                        autoComplete="email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Enter your password"
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
                          Remember me
                        </Label>
                      </div>
                    )}
                    
                    {isSignup && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              placeholder="Confirm your password"
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
                            <p className="text-xs text-destructive">Passwords do not match</p>
                          )}
                          {confirmPassword && password === confirmPassword && password.length > 0 && (
                            <p className="text-xs text-green-600">Passwords match ✓</p>
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
                              I agree to the Terms and Privacy Policy
                            </label>
                            <p className="text-xs text-muted-foreground">
                              By creating an account, you agree to our{" "}
                              <button
                                type="button"
                                onClick={() => setShowTermsModal(true)}
                                className="text-muted-foreground underline hover:text-foreground"
                              >
                                Terms of Service
                              </button>
                              {" "}and{" "}
                              <button
                                type="button"
                                onClick={() => setShowPrivacyModal(true)}
                                className="text-muted-foreground underline hover:text-foreground"
                              >
                                Privacy Policy
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
                      {isLoading || otpSending ? "Please wait..." : (isSignup ? "Continue" : "Login")}
                    </Button>

                    {isSignup && (
                      <div className="pt-3">
                        <p className="text-center text-xs text-muted-foreground mb-2">
                          {accountType === "client"
                            ? "Signing up as a renter? Switch if you own bikes:"
                            : "Signing up as a business? Switch if you want to rent:"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setAccountType(accountType === "client" ? "business" : "client")}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary text-foreground font-medium text-sm transition-all"
                        >
                          <span className="text-lg">{accountType === "client" ? "💼" : "🏍️"}</span>
                          <span>
                            {accountType === "client"
                              ? "Switch to Business Account"
                              : "Switch to Client Account"}
                          </span>
                        </button>
                      </div>
                    )}

                    {!isSignup && (
                      <>
                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={() => setAccountType(accountType === "client" ? "business" : "client")}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary text-foreground font-medium text-sm transition-all"
                          >
                            <span className="text-lg">{accountType === "client" ? "💼" : "🏍️"}</span>
                            <span>
                              {accountType === "client"
                                ? "Switch to Business Login"
                                : "Switch to Client Login"}
                            </span>
                          </button>
                        </div>
                        <div className="text-center">
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 text-sm text-primary hover:underline"
                            onClick={() => setShowForgotPassword(true)}
                          >
                            Forgot password?
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                  
                  <div className="mt-6 text-center">
                    <p className="text-muted-foreground">
                      {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                      <button
                        onClick={() => navigate(isSignup ? "/auth" : "/auth?mode=signup")}
                        className="text-primary font-semibold hover:underline"
                      >
                        {isSignup ? "Log In" : "Sign Up"}
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
