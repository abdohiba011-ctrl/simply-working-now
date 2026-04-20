import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoadingSkeleton, BookingHistorySkeleton, ProfileSkeleton, BikeDetailsSkeleton } from "@/components/ui/loading-skeleton";
import { AffiliateSkeleton } from "@/components/ui/affiliate-skeleton";
import { ScrollToTop } from "./components/ScrollToTop";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
import { LanguageSuggestionBanner } from "./components/LanguageSuggestionBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eagerly load critical above-the-fold pages
import Index from "./pages/Index";
import Listings from "./pages/Listings";
import Auth from "./pages/Auth";

// Lazy load all other page components
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const AffiliateSignup = lazy(() => import("./pages/AffiliateSignup"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const About = lazy(() => import("./pages/About"));
const Fixers = lazy(() => import("./pages/Fixers"));
const Contact = lazy(() => import("./pages/Contact"));
const ContactMessages = lazy(() => import("./pages/ContactMessages"));
const Quarterly = lazy(() => import("./pages/Quarterly"));
const GPSTracking = lazy(() => import("./pages/GPSTracking"));

const BecomeBusiness = lazy(() => import("./pages/BecomeBusiness"));
const Profile = lazy(() => import("./pages/Profile"));
const BikeDetails = lazy(() => import("./pages/BikeDetails"));
const BookingReview = lazy(() => import("./pages/BookingReview"));
const PaymentSelection = lazy(() => import("./pages/PaymentSelection"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Confirmation = lazy(() => import("./pages/Confirmation"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const AddBike = lazy(() => import("./pages/AddBike"));
const AllBookings = lazy(() => import("./pages/AllBookings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdminVerifications = lazy(() => import("./pages/AdminVerifications"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminBookingDetails = lazy(() => import("./pages/admin/AdminBookingDetails"));
const AdminFleet = lazy(() => import("./pages/admin/AdminFleet"));
const AdminBikeTypeDetails = lazy(() => import("./pages/admin/AdminBikeTypeDetails"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const UserVerificationDetails = lazy(() => import("./pages/UserVerificationDetails"));
const UserDetails = lazy(() => import("./pages/admin/UserDetails"));
const AdminClientDetails = lazy(() => import("./pages/admin/AdminClientDetails"));
const BusinessBookings = lazy(() => import("./pages/business/BusinessBookings"));
const BusinessBookingDetails = lazy(() => import("./pages/business/BusinessBookingDetails"));
const BusinessMotorbikes = lazy(() => import("./pages/business/BusinessMotorbikes"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Verification = lazy(() => import("./pages/Verification"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const CookiesPolicy = lazy(() => import("./pages/CookiesPolicy"));

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
        <AuthProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <LanguageSuggestionBanner />
            <BrowserRouter>
              <ScrollToTop />
              <ScrollToTopButton />
              <Suspense fallback={<PageLoadingSkeleton />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/listings" element={<Listings />} />
                  <Route path="/become-seller" element={<BecomeSeller />} />
                  <Route path="/affiliate" element={<Suspense fallback={<AffiliateSkeleton />}><Affiliate /></Suspense>} />
                  <Route path="/affiliate-signup" element={<AffiliateSignup />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/fixers" element={<Fixers />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/contact-messages" element={
                    <ProtectedRoute requireRole="admin"><ContactMessages /></ProtectedRoute>
                  } />
                  <Route path="/quarterly" element={<Quarterly />} />
                  <Route path="/gps-tracking" element={<GPSTracking />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/signup" element={<Auth />} />
                  <Route path="/become-business" element={<BecomeBusiness />} />
                  <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsConditions />} />
                  <Route path="/cookies" element={<CookiesPolicy />} />
                  <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<ProfileSkeleton />}><Profile /></Suspense></ProtectedRoute>} />
                  <Route path="/bike/:id" element={<Suspense fallback={<BikeDetailsSkeleton />}><BikeDetails /></Suspense>} />
                  <Route path="/booking-review" element={<BookingReview />} />
                  <Route path="/payment-selection" element={<ProtectedRoute><PaymentSelection /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/confirmation" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
                  <Route path="/business-dashboard" element={<ProtectedRoute requireRole="business"><BusinessDashboard /></ProtectedRoute>} />
                  <Route path="/add-bike" element={<ProtectedRoute requireRole="business"><AddBike /></ProtectedRoute>} />
                  <Route path="/all-bookings" element={<ProtectedRoute requireRole="business"><AllBookings /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute requireRole="business"><Analytics /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                  <Route path="/booking-history" element={<ProtectedRoute><Suspense fallback={<BookingHistorySkeleton />}><BookingHistory /></Suspense></ProtectedRoute>} />
                  <Route path="/booking/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/admin/verifications" element={<ProtectedRoute requireRole="admin"><AdminVerifications /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminPanel /></ProtectedRoute>} />
                  <Route path="/admin/panel" element={<ProtectedRoute requireRole="admin"><AdminPanel /></ProtectedRoute>} />
                  <Route path="/admin/bookings" element={<ProtectedRoute requireRole="admin"><AdminBookings /></ProtectedRoute>} />
                  <Route path="/admin/bookings/:id" element={<ProtectedRoute requireRole="admin"><AdminBookingDetails /></ProtectedRoute>} />
                  <Route path="/admin/fleet" element={<ProtectedRoute requireRole="admin"><AdminFleet /></ProtectedRoute>} />
                  <Route path="/admin/fleet/:id" element={<ProtectedRoute requireRole="admin"><AdminBikeTypeDetails /></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute requireRole="admin"><AdminAnalytics /></ProtectedRoute>} />
                  <Route path="/admin/users/:id" element={<ProtectedRoute requireRole="admin"><UserDetails /></ProtectedRoute>} />
                  <Route path="/admin/clients/:id" element={<ProtectedRoute requireRole="admin"><AdminClientDetails /></ProtectedRoute>} />
                  <Route path="/admin/verifications/:id" element={<ProtectedRoute requireRole="admin"><UserVerificationDetails /></ProtectedRoute>} />
                  <Route path="/business/bookings" element={<ProtectedRoute requireRole="business"><BusinessBookings /></ProtectedRoute>} />
                  <Route path="/business/booking/:id" element={<ProtectedRoute requireRole="business"><BusinessBookingDetails /></ProtectedRoute>} />
                  <Route path="/business/motorbikes" element={<ProtectedRoute requireRole="business"><BusinessMotorbikes /></ProtectedRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
