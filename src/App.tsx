import { lazy, Suspense } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MockProtectedRoute } from "@/components/auth/MockProtectedRoute";
import { PageLoadingSkeleton, BookingHistorySkeleton, ProfileSkeleton, BikeDetailsSkeleton } from "@/components/ui/loading-skeleton";
import { AffiliateSkeleton } from "@/components/ui/affiliate-skeleton";
import { ScrollToTop } from "./components/ScrollToTop";
import { OAuthHashWatcher } from "./components/OAuthHashWatcher";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
import { LanguageSuggestionBanner } from "./components/LanguageSuggestionBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AgencyShell } from "./components/agency/AgencyShell";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { AuthModal } from "./components/auth/AuthModal";
import { AuthModalRedirect } from "./components/auth/AuthModalRedirect";

// Eagerly load critical above-the-fold pages
import Index from "./pages/Index";
import RentCity from "./pages/RentCity";

// Lazy load all other page components
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const AffiliateSignup = lazy(() => import("./pages/AffiliateSignup"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const About = lazy(() => import("./pages/About"));
const Fixers = lazy(() => import("./pages/Fixers"));
const BookingFee = lazy(() => import("./pages/BookingFee"));
const Contact = lazy(() => import("./pages/Contact"));
const ContactMessages = lazy(() => import("./pages/ContactMessages"));
const Quarterly = lazy(() => import("./pages/Quarterly"));
const GPSTracking = lazy(() => import("./pages/GPSTracking"));
const Agencies = lazy(() => import("./pages/Agencies"));

const BecomeBusiness = lazy(() => import("./pages/BecomeBusiness"));
const Profile = lazy(() => import("./pages/Profile"));
const BikeDetails = lazy(() => import("./pages/BikeDetails"));
const BookingReview = lazy(() => import("./pages/BookingReview"));

const Checkout = lazy(() => import("./pages/Checkout"));
const PayYouCan = lazy(() => import("./pages/PayYouCan"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const Confirmation = lazy(() => import("./pages/Confirmation"));
const Settings = lazy(() => import("./pages/Settings"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Billing = lazy(() => import("./pages/Billing"));
const AdminVerifications = lazy(() => import("./pages/AdminVerifications"));
const AdminAgencyVerifications = lazy(() => import("./pages/admin/AdminAgencyVerifications"));
const AdminBikeApprovals = lazy(() => import("./pages/admin/AdminBikeApprovals"));
const AdminBikeReview = lazy(() => import("./pages/admin/AdminBikeReview"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminCredits = lazy(() => import("./pages/admin/AdminCredits"));
const AdminBookingDetails = lazy(() => import("./pages/admin/AdminBookingDetails"));
const AdminFleet = lazy(() => import("./pages/admin/AdminFleet"));
const AdminBikeTypeDetails = lazy(() => import("./pages/admin/AdminBikeTypeDetails"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const UserVerificationDetails = lazy(() => import("./pages/UserVerificationDetails"));
const UserDetails = lazy(() => import("./pages/admin/UserDetails"));
const AdminClientDetails = lazy(() => import("./pages/admin/AdminClientDetails"));
const AgencyDashboard = lazy(() => import("./pages/agency/Dashboard"));
const AgencyBookings = lazy(() => import("./pages/agency/Bookings"));
const AgencyBookingDetail = lazy(() => import("./pages/agency/BookingDetail"));
const AgencyPlaceholder = lazy(() => import("./pages/agency/Placeholder"));
const AgencyMotorbikes = lazy(() => import("./pages/agency/Motorbikes"));
const AgencyMotorbikeDetail = lazy(() => import("./pages/agency/MotorbikeDetail"));
const AgencyMotorbikeWizard = lazy(() => import("./pages/agency/MotorbikeWizard"));
const AgencyMessages = lazy(() => import("./pages/agency/Messages"));
const AgencyCalendar = lazy(() => import("./pages/agency/Calendar"));
const AgencyWallet = lazy(() => import("./pages/agency/Wallet"));
const AgencyTransactions = lazy(() => import("./pages/agency/Transactions"));
const AgencySubscription = lazy(() => import("./pages/agency/Subscription"));
const AgencyInvoices = lazy(() => import("./pages/agency/Invoices"));
const AgencyProfile = lazy(() => import("./pages/agency/Profile"));
const AgencyTeam = lazy(() => import("./pages/agency/Team"));
const AgencyVerification = lazy(() => import("./pages/agency/Verification"));
const AgencyAnalytics = lazy(() => import("./pages/agency/Analytics"));
const AgencyPreferences = lazy(() => import("./pages/agency/Preferences"));
const AgencyNotificationSettings = lazy(() => import("./pages/agency/NotificationSettings"));
const AgencyIntegrations = lazy(() => import("./pages/agency/Integrations"));
const AgencyHelp = lazy(() => import("./pages/agency/Help"));
const AgencyFinance = lazy(() => import("./pages/agency/Finance"));
const AgencyAgencyCenter = lazy(() => import("./pages/agency/AgencyCenter"));
const AgencySettingsHub = lazy(() => import("./pages/agency/SettingsHub"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Verification = lazy(() => import("./pages/Verification"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const CookiesPolicy = lazy(() => import("./pages/CookiesPolicy"));
const MockLogin = lazy(() => import("./pages/auth/Login"));
const AgencyLogin = lazy(() => import("./pages/auth/AgencyLogin"));
const AdminLogin = lazy(() => import("./pages/auth/AdminLogin"));
const MockSignup = lazy(() => import("./pages/auth/Signup"));
const AgencySignup = lazy(() => import("./pages/auth/AgencySignup"));
const MockVerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));

const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPasswordVerify = lazy(() => import("./pages/auth/ResetPasswordVerify"));
const ResetPasswordNew = lazy(() => import("./pages/auth/ResetPasswordNew"));
const SignupExtra = lazy(() => import("./pages/auth/SignupExtra"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <Toaster />
          <Sonner />
          <LanguageSuggestionBanner />
          <BrowserRouter>
            <ScrollToTop />
            <OAuthHashWatcher />
            <ScrollToTopButton />
            <AuthModalProvider>
              <AuthModal />
              <Suspense fallback={<PageLoadingSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/listings" element={<Navigate to="/rent/casablanca" replace />} />
                <Route path="/rent/:city" element={<RentCity />} />
                <Route path="/become-seller" element={<BecomeSeller />} />
                <Route path="/affiliate" element={<Suspense fallback={<AffiliateSkeleton />}><Affiliate /></Suspense>} />
                <Route path="/affiliate-signup" element={<AffiliateSignup />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/about" element={<About />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/fixers" element={<Fixers />} />
                <Route path="/booking-fee" element={<BookingFee />} />
                <Route path="/agencies" element={<Agencies />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/contact-messages" element={
                  <ProtectedRoute requireRole="admin"><ContactMessages /></ProtectedRoute>
                } />
                <Route path="/quarterly" element={<Quarterly />} />
                <Route path="/gps-tracking" element={<GPSTracking />} />
                {/* Legacy /auth → /login */}
                <Route path="/auth" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<AuthModalRedirect tab="login" />} />
                <Route path="/agency/login" element={<AgencyLogin />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/signup" element={<AuthModalRedirect tab="signup" />} />
                <Route path="/agency/signup" element={<AgencySignup />} />
                <Route path="/rent" element={<Navigate to="/rent/casablanca" replace />} />
                <Route path="/verify-email" element={<MockVerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/verify" element={<ResetPasswordVerify />} />
                <Route path="/reset-password/new" element={<ResetPasswordNew />} />
                {/* Legacy renter password reset paths → unified routes */}
                <Route path="/renter/forgot-password" element={<Navigate to="/forgot-password" replace />} />
                <Route path="/renter/reset-password/verify" element={<Navigate to="/reset-password/verify" replace />} />
                <Route path="/renter/reset-password/new" element={<Navigate to="/reset-password/new" replace />} />
                <Route path="/agency/signup-extra" element={<SignupExtra />} />
                <Route path="/become-business" element={<BecomeBusiness />} />
                <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
                <Route path="/cookies" element={<CookiesPolicy />} />
                <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<ProfileSkeleton />}><Profile /></Suspense></ProtectedRoute>} />
                <Route path="/bike/:id" element={<Suspense fallback={<BikeDetailsSkeleton />}><BikeDetails /></Suspense>} />
                <Route path="/booking-review" element={<BookingReview />} />
                <Route path="/payment-selection" element={<Navigate to="/booking-review" replace />} />
                <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/pay/youcanpay" element={<ProtectedRoute><PayYouCan /></ProtectedRoute>} />
                <Route path="/payment-status" element={<ProtectedRoute><PaymentStatus /></ProtectedRoute>} />
                <Route path="/confirmation" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />

                {/* Legacy business-* routes redirect into /agency/* */}
                <Route path="/business-dashboard" element={<Navigate to="/agency/dashboard" replace />} />
                <Route path="/add-bike" element={<Navigate to="/agency/motorbikes/new" replace />} />
                <Route path="/all-bookings" element={<Navigate to="/agency/bookings" replace />} />
                <Route path="/analytics" element={<Navigate to="/agency/analytics" replace />} />
                <Route path="/business/bookings" element={<Navigate to="/agency/bookings" replace />} />
                <Route path="/business/booking/:id" element={<Navigate to="/agency/bookings" replace />} />
                <Route path="/business/motorbikes" element={<Navigate to="/agency/motorbikes" replace />} />

                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                <Route path="/booking-history" element={<ProtectedRoute><Suspense fallback={<BookingHistorySkeleton />}><BookingHistory /></Suspense></ProtectedRoute>} />
                <Route path="/booking/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                <Route path="/admin/verifications" element={<ProtectedRoute requireRole="admin"><AdminVerifications /></ProtectedRoute>} />
                <Route path="/admin/agencies/verifications" element={<ProtectedRoute requireRole="admin"><AdminAgencyVerifications /></ProtectedRoute>} />
                <Route path="/admin/bikes/approvals" element={<ProtectedRoute requireRole="admin"><AdminBikeApprovals /></ProtectedRoute>} />
                <Route path="/admin/bikes/:id" element={<ProtectedRoute requireRole="admin"><AdminBikeReview /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminPanel /></ProtectedRoute>} />
                <Route path="/admin/panel" element={<ProtectedRoute requireRole="admin"><AdminPanel /></ProtectedRoute>} />
                <Route path="/admin/bookings" element={<ProtectedRoute requireRole="admin"><AdminBookings /></ProtectedRoute>} />
                <Route path="/admin/credits" element={<ProtectedRoute requireRole="admin"><AdminCredits /></ProtectedRoute>} />
                <Route path="/admin/bookings/:id" element={<ProtectedRoute requireRole="admin"><AdminBookingDetails /></ProtectedRoute>} />
                <Route path="/admin/fleet" element={<ProtectedRoute requireRole="admin"><AdminFleet /></ProtectedRoute>} />
                <Route path="/admin/fleet/:id" element={<ProtectedRoute requireRole="admin"><AdminBikeTypeDetails /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requireRole="admin"><AdminAnalytics /></ProtectedRoute>} />
                <Route path="/admin/users/:id" element={<ProtectedRoute requireRole="admin"><UserDetails /></ProtectedRoute>} />
                <Route path="/admin/clients/:id" element={<ProtectedRoute requireRole="admin"><AdminClientDetails /></ProtectedRoute>} />
                <Route path="/admin/verifications/:id" element={<ProtectedRoute requireRole="admin"><UserVerificationDetails /></ProtectedRoute>} />

                {/* Agency dashboard (new Wise-inspired UI) — shared shell so sidebar/header persist */}
                <Route path="/agency" element={<MockProtectedRoute role="agency"><AgencyShell /></MockProtectedRoute>}>
                  <Route index element={<Navigate to="/agency/dashboard" replace />} />
                  <Route path="dashboard" element={<AgencyDashboard />} />
                  <Route path="bookings" element={<AgencyBookings />} />
                  <Route path="bookings/:id" element={<AgencyBookingDetail />} />
                  <Route path="motorbikes" element={<AgencyMotorbikes />} />
                  <Route path="motorbikes/new" element={<AgencyMotorbikeWizard />} />
                  <Route path="motorbikes/:id/edit" element={<AgencyMotorbikeWizard />} />
                  <Route path="motorbikes/:id" element={<AgencyMotorbikeDetail />} />
                  <Route path="messages" element={<AgencyMessages />} />
                  <Route path="calendar" element={<AgencyCalendar />} />

                  {/* New consolidated hub pages */}
                  <Route path="finance" element={<AgencyFinance />} />
                  <Route path="agency-center" element={<AgencyAgencyCenter />} />
                  <Route path="settings" element={<AgencySettingsHub />} />

                  {/* Legacy direct routes (still navigable, redirect-friendly) */}
                  <Route path="wallet" element={<Navigate to="/agency/finance#wallet" replace />} />
                  <Route path="transactions" element={<Navigate to="/agency/finance#transactions" replace />} />
                  <Route path="subscription" element={<Navigate to="/agency/finance#subscription" replace />} />
                  <Route path="invoices" element={<Navigate to="/agency/finance#invoices" replace />} />
                  <Route path="profile" element={<Navigate to="/agency/agency-center#profile" replace />} />
                  <Route path="team" element={<Navigate to="/agency/agency-center#team" replace />} />
                  <Route path="verification" element={<Navigate to="/agency/agency-center#verification" replace />} />
                  <Route path="analytics" element={<Navigate to="/agency/agency-center#analytics" replace />} />
                  <Route path="preferences" element={<Navigate to="/agency/settings#preferences" replace />} />
                  <Route path="notifications" element={<Navigate to="/agency/settings#notifications" replace />} />
                  <Route path="integrations" element={<Navigate to="/agency/settings#integrations" replace />} />
                  <Route path="help" element={<Navigate to="/agency/settings#help" replace />} />
                  <Route path="settings/preferences" element={<Navigate to="/agency/settings#preferences" replace />} />
                  <Route path="settings/notifications" element={<Navigate to="/agency/settings#notifications" replace />} />
                  <Route path="settings/integrations" element={<Navigate to="/agency/settings#integrations" replace />} />

                  <Route path=":slug" element={<AgencyPlaceholder />} />
                  <Route path=":slug/:sub" element={<AgencyPlaceholder />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </AuthModalProvider>
          </BrowserRouter>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
