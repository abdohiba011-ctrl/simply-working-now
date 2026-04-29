import { useState, useEffect } from "react";
import { getErrMsg } from "@/lib/errorMessages";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  Building2, 
  User, 
  CheckCircle, 
  ArrowRight, 
  TrendingUp,
  Users,
  FileText,
  Shield,
  MapPin,
  Phone,
  Gift,
  DollarSign,
  Clock,
  AlertTriangle,
  Bike,
  BarChart3,
  Printer,
  ShieldCheck,
  Headphones,
  Target,
  Percent,
  Star,
  Zap,
  Lock,
  BadgeCheck,
  Loader2
} from "lucide-react";
import { VerificationSkeleton } from "@/components/ui/bike-skeleton";

const BecomeBusiness = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasRole } = useAuth();
  const { t, isRTL } = useLanguage();
  const [isVerified, setIsVerified] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerType, setPartnerType] = useState<"individual" | "shop" | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  
  // Application form state
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [autoEntrepreneurNumber, setAutoEntrepreneurNumber] = useState("");
  const [companyRC, setCompanyRC] = useState("");
  const [bikesCount, setBikesCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Individual partner document uploads (file_path in business-applications bucket)
  type DocKind = "id_front" | "id_back" | "bike_photo" | "ownership_paper";
  const [docPaths, setDocPaths] = useState<Record<DocKind, string | null>>({
    id_front: null,
    id_back: null,
    bike_photo: null,
    ownership_paper: null,
  });
  const [uploadingDoc, setUploadingDoc] = useState<DocKind | null>(null);

  const uploadDoc = async (kind: DocKind, file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploadingDoc(kind);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('business-applications')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setDocPaths((prev) => ({ ...prev, [kind]: path }));
      toast.success("Uploaded");
    } catch (err) {
      toast.error(getErrMsg(err) || "Upload failed");
    } finally {
      setUploadingDoc(null);
    }
  };

  useEffect(() => {
    if (user) {
      checkUserStatus();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const checkUserStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified, phone')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setIsVerified(data?.is_verified || false);
      setHasPhone(!!data?.phone);
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!user) return;
    
    // Individual partners now upload documents instead of an auto-entrepreneur number

    if (partnerType === "shop" && (!companyRC || !businessName)) {
      toast.error(t('becomeBusiness.companyDetailsRequired') || "Please fill in all company details");
      return;
    }
    
    if (!businessPhone) {
      toast.error(t('becomeBusiness.phoneRequired') || "Business phone number is required");
      return;
    }
    
    const minBikes = partnerType === "individual" ? 1 : 3;
    if (parseInt(bikesCount) < minBikes) {
      toast.error(`${t('becomeBusiness.minimumBikesRequired') || 'You need at least'} ${minBikes} ${t('becomeBusiness.motorbikes') || 'motorbike(s)'}`);
      return;
    }

    if (partnerType === "individual") {
      const requiredDocs: DocKind[] = ["id_front", "id_back", "bike_photo", "ownership_paper"];
      const missing = requiredDocs.filter((k) => !docPaths[k]);
      if (missing.length > 0) {
        toast.error("Please upload all required documents (ID front, ID back, motorbike photo, ownership paper)");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Update profile with business_pending status (don't add role yet - wait for admin approval)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: 'business_pending',
          business_type: partnerType === 'individual' ? 'individual_owner' : 'rental_shop'
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Send application to contact_messages for admin review
      const { data: appRow, error: messageError } = await supabase
        .from('contact_messages')
        .insert({
          name: businessName || 'Individual Partner',
          email: user.email || '',
          phone: businessPhone,
          type: 'business_application',
          message: JSON.stringify({
            partnerType,
            autoEntrepreneurNumber,
            companyRC,
            bikesCount,
            userId: user.id,
            documents: partnerType === 'individual' ? docPaths : undefined,
          })
        })
        .select('id')
        .single();

      if (messageError) throw messageError;

      // Persist document references for individual applications
      if (partnerType === 'individual' && appRow?.id) {
        const docRows = (Object.entries(docPaths) as [DocKind, string | null][])
          .filter(([, path]) => !!path)
          .map(([kind, path]) => ({
            application_id: appRow.id,
            user_id: user.id,
            kind,
            file_path: path as string,
          }));
        if (docRows.length > 0) {
          const { error: docsError } = await supabase
            .from('business_application_documents')
            .insert(docRows);
          if (docsError) console.error('Failed to persist application documents:', docsError);
        }
      }

      if (messageError) throw messageError;

      // Send email notification to admin about new application
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'new_business_application',
            recipientEmail: 'admin@motonita.ma',
            recipientName: 'Motonita Admin',
            data: {
              partnerType,
              businessName: businessName || 'Individual Partner',
              applicantName: businessName || 'Individual Partner',
              applicantEmail: user.email,
              applicantPhone: businessPhone,
              bikesCount,
              autoEntrepreneurNumber,
              companyRC
            }
          }
        });
        console.log('Admin notification email sent successfully');
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast.success(t('becomeBusiness.applicationSubmitted') || "Application submitted successfully!");
      navigate("/thank-you?type=business");
    } catch (error: unknown) {
      toast.error(getErrMsg(error) || t('becomeBusiness.applicationFailed') || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const problems = [
    { icon: Clock, text: t('becomeBusiness.problem1') },
    { icon: Users, text: t('becomeBusiness.problem2') },
    { icon: DollarSign, text: t('becomeBusiness.problem3') },
    { icon: FileText, text: t('becomeBusiness.problem4') },
    { icon: AlertTriangle, text: t('becomeBusiness.problem5') },
    { icon: Shield, text: t('becomeBusiness.problem6') },
  ];

  const benefits = [
    { icon: Target, title: t('becomeBusiness.benefit1Title'), description: t('becomeBusiness.benefit1Desc') },
    { icon: BarChart3, title: t('becomeBusiness.benefit2Title'), description: t('becomeBusiness.benefit2Desc') },
    { icon: Printer, title: t('becomeBusiness.benefit3Title'), description: t('becomeBusiness.benefit3Desc') },
    { icon: ShieldCheck, title: t('becomeBusiness.benefit4Title'), description: t('becomeBusiness.benefit4Desc') },
    { icon: MapPin, title: t('becomeBusiness.benefit5Title'), description: t('becomeBusiness.benefit5Desc') },
    { icon: Shield, title: t('becomeBusiness.benefit6Title'), description: t('becomeBusiness.benefit6Desc') },
    { icon: Headphones, title: t('becomeBusiness.benefit7Title'), description: t('becomeBusiness.benefit7Desc') },
    { icon: Gift, title: t('becomeBusiness.benefit8Title'), description: t('becomeBusiness.benefit8Desc') },
  ];

  const commissions = [
    { duration: t('becomeBusiness.duration1Day') || "1 day", rate: "20%" },
    { duration: t('becomeBusiness.duration2_3Days') || "2-3 days", rate: "15%" },
    { duration: t('becomeBusiness.duration4_7Days') || "4-7 days", rate: "10%" },
    { duration: t('becomeBusiness.duration8_15Days') || "8-15 days", rate: "5%" },
    { duration: t('becomeBusiness.duration15_30Days') || "15 days - 1 month", rate: "4%" },
    { duration: t('becomeBusiness.duration1Month') || "1+ month", rate: "3%" },
  ];

  const yourJob = [
    t('becomeBusiness.yourJob1'),
    t('becomeBusiness.yourJob2'),
    t('becomeBusiness.yourJob3'),
    t('becomeBusiness.yourJob4'),
  ];

  const ourJob = [
    t('becomeBusiness.ourJob1'),
    t('becomeBusiness.ourJob2'),
    t('becomeBusiness.ourJob3'),
    t('becomeBusiness.ourJob4'),
    t('becomeBusiness.ourJob5'),
    t('becomeBusiness.ourJob6'),
    t('becomeBusiness.ourJob7'),
    t('becomeBusiness.ourJob8'),
  ];

  // Not logged in - Show full landing page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          <section className="relative py-20 bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden">
            <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_1px_1px,theme(colors.primary/0.1)_1px,transparent_0)] bg-[size:20px_20px]"></div>
            <div className="container mx-auto px-4 relative">
              <div className="max-w-4xl mx-auto text-center">
                <Badge variant="secondary" className="mb-4 text-sm px-4 py-1">
                  <Zap className="w-4 h-4 mr-1" />
                  {t('becomeBusiness.partnerProgram')}
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                  {t('becomeBusiness.heroTitle')} <span className="text-primary">{t('becomeBusiness.heroTitleHighlight')}</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  {t('becomeBusiness.heroSubtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="hero" onClick={() => navigate("/auth?mode=signup")} className="text-lg px-8">
                    {t('becomeBusiness.getStarted')}
                    <ArrowRight className={`h-5 w-5 rtl-flip ${isRTL ? 'mr-2' : 'ml-2'}`} />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
                    {t('becomeBusiness.alreadyHaveAccount')}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Problems Section */}
          <section className="py-16 bg-destructive/5">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    {t('becomeBusiness.soundFamiliar')}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('becomeBusiness.dailyStruggles')}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {problems.map((problem, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-background rounded-lg border border-destructive/20">
                      <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                        <problem.icon className="h-5 w-5 text-destructive" />
                      </div>
                      <p className="text-foreground">{problem.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Solution Section */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <Badge variant="outline" className="mb-4">{t('becomeBusiness.ourSolution')}</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    {t('becomeBusiness.heavyLifting')}
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {t('becomeBusiness.heavyLiftingDesc')}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {benefits.map((benefit, index) => (
                    <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20">
                      <CardContent className="p-6">
                        <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                          <benefit.icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-foreground">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Your Job vs Our Job */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    {t('becomeBusiness.yourJobVsOurs')}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('becomeBusiness.focusOnBikes')}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        {t('becomeBusiness.yourResponsibilities')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {yourJob.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {t('becomeBusiness.ourResponsibilities')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {ourJob.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Commission Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <Badge variant="outline" className="mb-4">
                    <Percent className="w-4 h-4 mr-1" />
                    {t('becomeBusiness.transparentPricing')}
                  </Badge>
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    {t('becomeBusiness.simpleCommission')}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('becomeBusiness.simpleCommissionDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {commissions.map((item, index) => (
                    <Card key={index} className="text-center hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="text-3xl font-bold text-primary mb-2">{item.rate}</div>
                        <div className="text-sm text-muted-foreground">{item.duration}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <p className="text-center text-sm text-muted-foreground mt-8">
                  {t('becomeBusiness.ourGoal')}
                </p>
              </div>
            </div>
          </section>

          {/* Requirements Section */}
          <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-foreground mb-4">{t('becomeBusiness.whoCanJoin')}</h2>
                  <p className="text-muted-foreground">
                    {t('becomeBusiness.choosePartnerType')}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Individual */}
                  <Card className="relative overflow-hidden border-2 hover:border-primary/30 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full"></div>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <User className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle>{t('becomeBusiness.individualOwner')}</CardTitle>
                          <p className="text-sm text-muted-foreground">{t('becomeBusiness.autoEntrepreneur') || 'Auto-entrepreneur'}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm">{t('becomeBusiness.individualReq1')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm">{t('becomeBusiness.individualReq2')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm">{t('becomeBusiness.individualReq3')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rental Shop */}
                  <Card className="relative overflow-hidden border-2 hover:border-primary/30 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full"></div>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle>{t('becomeBusiness.rentalShop')}</CardTitle>
                          <p className="text-sm text-muted-foreground">{t('becomeBusiness.registeredCompany') || 'Registered company'}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm">{t('becomeBusiness.shopReq1')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm">{t('becomeBusiness.shopReq2')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm">{t('becomeBusiness.shopReq3')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <Star className="h-12 w-12 mx-auto mb-6 opacity-80" />
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  {t('becomeBusiness.joinFirstPartners') || 'Join the First Partners in Casablanca'}
                </h2>
                <p className="text-lg opacity-90 mb-4">
                  {t('becomeBusiness.expandingCities') || 'We are starting in Casablanca and expanding to Marrakesh, Agadir, and Rabat.'}
                </p>
                <p className="text-lg opacity-90 mb-8">
                  {t('becomeBusiness.earlyPartnersBonus') || 'Early partners get 10 free clients to start and priority promotion in their area.'}
                </p>
                <Button size="lg" variant="secondary" onClick={() => navigate("/auth?mode=signup")} className="text-lg px-8">
                  {t('becomeBusiness.startApplication') || 'Start Your Application'}
                  <ArrowRight className={`h-5 w-5 rtl-flip ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-lg">
            <VerificationSkeleton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not verified
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16">
          <div className="container mx-auto px-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
              <ChevronLeft className={`h-4 w-4 rtl-flip ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('common.back')}
            </Button>
            
            <div className="max-w-lg mx-auto">
              <Card className="border-2 border-destructive/20">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-destructive/10 rounded-full w-fit mx-auto mb-6">
                    <Lock className="h-12 w-12 text-destructive" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-4">
                    {t('becomeBusiness.verificationRequired') || 'Verification Required'}
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    {t('becomeBusiness.verificationRequiredDesc') || 'To become a business partner, you must first verify your identity. This helps us maintain a trusted network of partners.'}
                  </p>
                  <div className="space-y-3">
                    <Button className="w-full" size="lg" onClick={() => navigate("/profile")}>
                      <BadgeCheck className="mr-2 h-5 w-5" />
                      {t('becomeBusiness.verifyMyAccount') || 'Verify My Account'}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                      {t('notFound.goToHomepage')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // No phone
  if (!hasPhone) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16">
          <div className="container mx-auto px-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
              <ChevronLeft className={`h-4 w-4 rtl-flip ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('common.back')}
            </Button>
            
            <div className="max-w-lg mx-auto">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-6">
                    <Phone className="h-12 w-12 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-4">
                    {t('becomeBusiness.phoneRequired') || 'Phone Number Required'}
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    {t('becomeBusiness.phoneRequiredDesc') || 'Please add your phone number to your profile before becoming a partner. We need to be able to contact you.'}
                  </p>
                  <Button className="w-full" size="lg" onClick={() => navigate("/profile")}>
                    {t('becomeBusiness.addPhoneNumber') || 'Add Phone Number'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show application form
  if (showApplicationForm && partnerType) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16">
          <div className="container mx-auto px-4">
            <Button variant="ghost" onClick={() => setShowApplicationForm(false)} className="mb-6">
              <ChevronLeft className={`h-4 w-4 rtl-flip ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('common.back')}
            </Button>
            
            <div className="max-w-lg mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {partnerType === "individual" ? (
                      <User className="h-6 w-6 text-primary" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                    {partnerType === "individual" 
                      ? t('becomeBusiness.individualApplication') || 'Individual Partner Application'
                      : t('becomeBusiness.shopApplication') || 'Rental Shop Application'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {partnerType === "shop" && (
                    <div className="space-y-2">
                      <Label htmlFor="businessName">{t('becomeBusiness.businessName')} *</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder={t('becomeBusiness.businessNamePlaceholder') || 'Your rental shop name'}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">{t('becomeBusiness.businessPhone')} *</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="+212 6XX XXX XXX"
                      className="ltr-input"
                    />
                  </div>

                  {partnerType === "individual" ? (
                    <div className="space-y-2">
                      <Label htmlFor="autoEntrepreneur">{t('becomeBusiness.autoEntrepreneurNumber')} *</Label>
                      <Input
                        id="autoEntrepreneur"
                        value={autoEntrepreneurNumber}
                        onChange={(e) => setAutoEntrepreneurNumber(e.target.value)}
                        placeholder={t('becomeBusiness.autoEntrepreneurPlaceholder') || 'Your auto entrepreneur card number'}
                        className="ltr-input"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="companyRC">{t('becomeBusiness.companyRC')} *</Label>
                      <Input
                        id="companyRC"
                        value={companyRC}
                        onChange={(e) => setCompanyRC(e.target.value)}
                        placeholder={t('becomeBusiness.companyRCPlaceholder') || 'Registre du Commerce number'}
                        className="ltr-input"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bikesCount">{t('becomeBusiness.numberOfBikes')} *</Label>
                    <Input
                      id="bikesCount"
                      type="number"
                      value={bikesCount}
                      onChange={(e) => setBikesCount(e.target.value)}
                      placeholder={partnerType === "individual" 
                        ? t('becomeBusiness.minimum1') || 'Minimum 1'
                        : t('becomeBusiness.minimum3') || 'Minimum 3'}
                      min={partnerType === "individual" ? 1 : 3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {partnerType === "individual" 
                        ? t('becomeBusiness.individualMinBikes') || 'Individual partners need at least 1 motorbike'
                        : t('becomeBusiness.shopMinBikes') || 'Rental shops need at least 3 motorbikes'}
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button 
                      className="w-full" 
                      size="lg" 
                      onClick={handleSubmitApplication}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('becomeBusiness.submitting')}
                        </>
                      ) : (
                        <>
                          {t('becomeBusiness.submitApplication')}
                          <ArrowRight className={`h-4 w-4 rtl-flip ${isRTL ? 'mr-2' : 'ml-2'}`} />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Main selection screen (verified user)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ChevronLeft className={`h-4 w-4 rtl-flip ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('common.back')}
          </Button>
          
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-6">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t('becomeBusiness.becomePartnerTitle') || 'Become a Business Partner'}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                {t('becomeBusiness.becomePartnerDesc') || 'List your motorbikes and start earning with Motonita. Choose your partner type to continue.'}
              </p>
              
              {/* Verified Badge */}
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary/10 rounded-full">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-primary">{t('becomeBusiness.accountVerified') || 'Account Verified'}</span>
              </div>
            </div>

            {/* Partner Type Selection */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Individual */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  partnerType === "individual" ? "border-2 border-primary ring-2 ring-primary/20" : "border-2 hover:border-primary/30"
                }`}
                onClick={() => setPartnerType("individual")}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${partnerType === "individual" ? "bg-primary text-primary-foreground" : "bg-primary/10"}`}>
                      <User className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{t('becomeBusiness.individualOwner')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{t('becomeBusiness.individualOwnerDesc') || 'Auto-entrepreneur with personal bikes'}</p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{t('becomeBusiness.individualReq1')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{t('becomeBusiness.individualReq2')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{t('becomeBusiness.phoneNumberReq') || 'Phone number'}</span>
                        </div>
                      </div>
                    </div>
                    {partnerType === "individual" && (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rental Shop */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  partnerType === "shop" ? "border-2 border-primary ring-2 ring-primary/20" : "border-2 hover:border-primary/30"
                }`}
                onClick={() => setPartnerType("shop")}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${partnerType === "shop" ? "bg-primary text-primary-foreground" : "bg-primary/10"}`}>
                      <Building2 className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{t('becomeBusiness.rentalShop')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{t('becomeBusiness.rentalShopDesc') || 'Registered company with multiple bikes'}</p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{t('becomeBusiness.shopReq1')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{t('becomeBusiness.shopReq2')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{t('becomeBusiness.shopReq3')}</span>
                        </div>
                      </div>
                    </div>
                    {partnerType === "shop" && (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Continue Button */}
            {partnerType && (
              <div className="text-center">
                <Button 
                  size="lg" 
                  onClick={() => setShowApplicationForm(true)}
                  className="px-8"
                >
                  {t('common.continue') || 'Continue'}
                  <ArrowRight className={`h-5 w-5 rtl-flip ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BecomeBusiness;
