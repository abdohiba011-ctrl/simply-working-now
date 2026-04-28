import { BusinessLayout } from "@/components/layouts/BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bike, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Calendar, 
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardStats {
  totalBikes: number;
  availableBikes: number;
  rentedBikes: number;
  totalRevenue: number;
  monthlyRevenue: number;
  growthRate: number;
  activeBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
}

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { hasRole, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('not_started');
  const [stats, setStats] = useState<DashboardStats>({
    totalBikes: 0,
    availableBikes: 0,
    rentedBikes: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    growthRate: 0,
    activeBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
  });

  // Check if user has business role and fetch stats
  useEffect(() => {
    const checkAccessAndFetchData = async () => {
      if (!isAuthenticated) {
        toast.error(t('business.pleaseLogin') || "Please log in to access the dashboard");
        navigate("/auth");
        return;
      }

      const isBusiness = await hasRole('business');
      if (!isBusiness) {
        toast.error(t('business.noAccess') || "You don't have access to the business dashboard. Please create a business account.");
        navigate("/");
        return;
      }

      // Check verification status
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified, verification_status')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setIsVerified(profile.is_verified || false);
          setVerificationStatus(profile.verification_status || 'not_started');
        }
      }

      // Fetch real data from database - ONLY for this business user
      try {
        // First get bike_types owned by this business
        const { data: ownedBikeTypes } = await supabase
          .from('bike_types')
          .select('id')
          .eq('owner_id', user!.id);

        const ownedBikeTypeIds = ownedBikeTypes?.map(bt => bt.id) || [];

        // Fetch bikes count - only bikes belonging to this business's bike types
        let totalBikes = 0;
        let availableBikes = 0;
        let rentedBikes = 0;

        if (ownedBikeTypeIds.length > 0) {
          const { data: bikesData } = await supabase
            .from('bikes')
            .select('id, available')
            .in('bike_type_id', ownedBikeTypeIds);
          
          totalBikes = bikesData?.length || 0;
          availableBikes = bikesData?.filter(b => b.available)?.length || 0;
          rentedBikes = totalBikes - availableBikes;
        }

        // Fetch bookings - only bookings assigned to this business
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id, status, booking_status, total_price, created_at')
          .eq('assigned_to_business', user!.id);
        
        const getStatus = (b: { status: string | null; booking_status: string | null }) => b.booking_status || b.status;
        const activeBookings = bookingsData?.filter(b => getStatus(b) === 'confirmed' || getStatus(b) === 'active')?.length || 0;
        const completedBookings = bookingsData?.filter(b => getStatus(b) === 'completed')?.length || 0;
        const pendingBookings = bookingsData?.filter(b => getStatus(b) === 'pending')?.length || 0;
        const cancelledBookings = bookingsData?.filter(b => getStatus(b) === 'cancelled')?.length || 0;

        // Calculate revenue from completed bookings only
        const totalRevenue = bookingsData?.filter(b => getStatus(b) === 'completed')
          ?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        
        // Get current month completed bookings for monthly revenue
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthlyRevenue = bookingsData?.filter(b => getStatus(b) === 'completed' && b.created_at >= startOfMonth)
          ?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

        setStats({
          totalBikes,
          availableBikes,
          rentedBikes,
          totalRevenue,
          monthlyRevenue,
          growthRate: 0, // Would need historical data
          activeBookings,
          completedBookings,
          pendingBookings,
          cancelledBookings,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }

      setIsLoading(false);
    };

    checkAccessAndFetchData();
  }, [isAuthenticated, hasRole, navigate, user, t]);

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">{t('common.loading') || 'Loading dashboard...'}</p>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="p-6">
        {/* Verification Status Banner */}
        {isVerified === false && (
          <Card className={`mb-6 ${verificationStatus === 'pending_review' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 'border-blue-500 bg-blue-50 dark:bg-blue-950'}`}>
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${verificationStatus === 'pending_review' ? 'bg-yellow-200 dark:bg-yellow-800' : 'bg-blue-200 dark:bg-blue-800'}`}>
                  {verificationStatus === 'pending_review' ? (
                    <Clock className="h-6 w-6 text-yellow-700 dark:text-yellow-300" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                  )}
                </div>
                <div className="flex-1">
                  {verificationStatus === 'pending_review' ? (
                    <>
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">{t('business.verificationPendingTitle') || 'Your Account is Pending Verification'}</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {t('business.verificationPending')}
                      </p>
                    </>
                  ) : verificationStatus === 'rejected' ? (
                    <>
                      <h3 className="font-semibold text-red-800 dark:text-red-200">{t('business.verificationRejected')}</h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {t('business.resubmitDocuments')}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => navigate('/verification')}
                      >
                        {t('idVerification.resubmit')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200">{t('business.completeVerification') || 'Complete Your Verification'}</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {t('business.verificationRequired') || 'To access all business features, please complete your identity verification.'}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => navigate('/verification')}
                      >
                        {t('becomeBusiness.goToVerification')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('business.dashboard')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('business.overview')}</p>
        </div>

        {/* Key Metrics Grid - Neutral colors, side stroke only */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Bikes */}
          <Card className="border-l-4 border-l-gray-400 border-t-border border-r-border border-b-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('business.totalBikes')}</CardTitle>
              <Bike className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalBikes}</div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-muted-foreground">{stats.availableBikes} {t('listings.available')?.toLowerCase()}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{stats.rentedBikes} {t('business.rented') || 'rented'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="border-l-4 border-l-gray-400 border-t-border border-r-border border-b-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('business.monthlyRevenue')}</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.monthlyRevenue} DH</div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +18% {t('business.fromLastMonth') || 'from last month'}
              </p>
            </CardContent>
          </Card>

          {/* Active Bookings */}
          <Card className="border-l-4 border-l-gray-400 border-t-border border-r-border border-b-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('business.activeBookings')}</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.activeBookings}</div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                {stats.completedBookings} {t('business.completed')?.toLowerCase()}
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="border-l-4 border-l-gray-400 border-t-border border-r-border border-b-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('business.totalRevenue')}</CardTitle>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalRevenue} DH</div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.growthRate}% {t('business.thisYear') || 'this year'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Booking Status Overview - Neutral icons */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-lg">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('business.completed')}</p>
                  <p className="text-xl font-bold text-foreground">{stats.completedBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('business.active')}</p>
                  <p className="text-xl font-bold text-foreground">{stats.activeBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-lg">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('business.pending')}</p>
                  <p className="text-xl font-bold text-foreground">{stats.pendingBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-lg">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('business.cancelled')}</p>
                  <p className="text-xl font-bold text-foreground">{stats.cancelledBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;
