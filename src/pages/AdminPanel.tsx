import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Users, Building2, UserCog, Clock, CheckCircle, XCircle, UserX, Calendar, Bike, BarChart3, Map, Mail, CreditCard } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminPermissions, AdminTabPermission } from "@/hooks/useAdminPermissions";
import { AdminUnifiedClientsTab } from "@/components/admin/AdminUnifiedClientsTab";
import { AdminBusinessClientsTab } from "@/components/admin/AdminBusinessClientsTab";
import { AdminEmployeesTab } from "@/components/admin/AdminEmployeesTab";
import { AdminBookingsTab } from "@/components/admin/AdminBookingsTab";
import { AdminFleetTab } from "@/components/admin/AdminFleetTab";
import { AdminCitiesTab } from "@/components/admin/AdminCitiesTab";
import { AdminPaymentsTab } from "@/components/admin/AdminPaymentsTab";
import { AdminEmailTestTab } from "@/components/admin/AdminEmailTestTab";
import { TabErrorBoundary } from "@/components/TabErrorBoundary";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load analytics tab to avoid loading recharts on initial load
const AdminAnalyticsTab = lazy(() => import("@/components/admin/AdminAnalyticsTab").then(m => ({ default: m.AdminAnalyticsTab })));

type TabValue = "clients" | "business-clients" | "employees" | "bookings" | "payments" | "fleet" | "analytics" | "cities" | "email";
type FilterValue = "all" | "pending" | "verified" | "not_verified" | "blocked";

// Map tab values to permission keys
const TAB_PERMISSION_MAP: Record<TabValue, AdminTabPermission | null> = {
  bookings: "bookings",
  payments: "bookings", // reuse bookings permission
  fleet: "fleet",
  // The merged Cities tab now also covers what used to be the Locations tab,
  // so users with either legacy permission can see it (handled below).
  cities: "cities",
  clients: "clients",
  // The merged business-clients tab is special-cased below: visible if the
  // user has either the legacy individual_owners OR rental_shops permission.
  "business-clients": null,
  employees: null, // Employees tab is always visible for admins
  analytics: "analytics",
  email: null, // Email test tab is always visible for admins
};

interface StatusCounts {
  pending: number;
  verified: number;
  not_verified: number;
  blocked: number;
}

const AdminPanel = () => {
  const { hasRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { hasPermission, isLoading: permissionsLoading, isFullAdmin, isSuperAdmin } = useAdminPermissions();

  // Read initial tab from URL query param (and migrate the old values)
  const rawInitial = searchParams.get('tab') as TabValue | "individual-owners" | "rental-shops" | "pricing" | "locations" | null;
  const migratedInitial: TabValue =
    rawInitial === "individual-owners" || rawInitial === "rental-shops"
      ? "business-clients"
      : rawInitial === "locations"
        ? "cities"
        : rawInitial === "pricing" || !rawInitial
          ? "bookings"
          : (rawInitial as TabValue);
  const [activeTab, setActiveTab] = useState<TabValue>(migratedInitial);
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ pending: 0, verified: 0, not_verified: 0, blocked: 0 });
  const [retryKey, setRetryKey] = useState(0);
  const isAdmin = hasRole('admin');

  useAdminNotifications();

  // Force re-render of error boundary when retry is clicked
  const handleTabRetry = useCallback(() => {
    setRetryKey(prev => prev + 1);
  }, []);

  const allTabs = [
    { value: "bookings" as TabValue, label: t('admin.bookings'), icon: Calendar },
    { value: "payments" as TabValue, label: t('admin.payments'), icon: CreditCard },
    { value: "fleet" as TabValue, label: t('admin.bikes'), icon: Bike },
    { value: "cities" as TabValue, label: t('admin.cities'), icon: Map },
    { value: "clients" as TabValue, label: t('admin.renterClients'), icon: Users },
    { value: "business-clients" as TabValue, label: "Business Clients", icon: Building2 },
    { value: "employees" as TabValue, label: t('admin.employees'), icon: UserCog },
    { value: "analytics" as TabValue, label: t('admin.analytics'), icon: BarChart3 },
    { value: "email" as TabValue, label: "Email", icon: Mail },
  ];

  // Filter tabs based on user permissions
  const tabs = useMemo(() => {
    if (isFullAdmin || isSuperAdmin) return allTabs;

    return allTabs.filter(tab => {
      // The merged business-clients tab needs either legacy permission
      if (tab.value === "business-clients") {
        return hasPermission("individual_owners") || hasPermission("rental_shops");
      }
      // The merged Cities tab also covers the old Locations tab
      if (tab.value === "cities") {
        return hasPermission("cities") || hasPermission("locations");
      }
      const permissionKey = TAB_PERMISSION_MAP[tab.value];
      if (permissionKey === null) return true;
      return hasPermission(permissionKey);
    });
  }, [isFullAdmin, isSuperAdmin, hasPermission, allTabs]);

  useEffect(() => {
    if (isAdmin) {
      fetchStatusCounts();
    }
  }, [isAdmin]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      // Scope counts to renter-side profiles only so they always match the
      // unified clients table below (which excludes business profiles).
      const renterScope = 'user_type.is.null,user_type.eq.client,user_type.eq.renter';
      const [pendingRes, verifiedRes, notVerifiedRes, blockedRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or(renterScope)
          .eq('verification_status', 'pending_review'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or(renterScope)
          .eq('is_verified', true),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or(renterScope)
          .or('is_verified.is.null,is_verified.eq.false')
          .neq('verification_status', 'pending_review'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or(renterScope)
          .eq('is_frozen', true),
      ]);

      setStatusCounts({
        pending: pendingRes.count || 0,
        verified: verifiedRes.count || 0,
        not_verified: notVerifiedRes.count || 0,
        blocked: blockedRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching status counts:', error);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">Please log in to access this page</h1>
          <Button className="mt-4" onClick={() => navigate('/auth')}>Log In</Button>
        </main>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <main className="flex-1 py-16 container mx-auto px-4 text-center">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
        </main>
      </AdminLayout>
    );
  }

  const statusCards = [
    { key: "pending" as FilterValue, label: "Pending", count: statusCounts.pending, icon: Clock, color: "text-warning", bgColor: "bg-warning/10 hover:bg-warning/20 dark:bg-warning/10" },
    { key: "verified" as FilterValue, label: "Verified", count: statusCounts.verified, icon: CheckCircle, color: "text-success", bgColor: "bg-success/10 hover:bg-success/20 dark:bg-success/10" },
    { key: "not_verified" as FilterValue, label: "Not Verified", count: statusCounts.not_verified, icon: XCircle, color: "text-muted-foreground", bgColor: "bg-muted hover:bg-muted/80" },
    { key: "blocked" as FilterValue, label: "Blocked", count: statusCounts.blocked, icon: UserX, color: "text-destructive", bgColor: "bg-destructive/10 hover:bg-destructive/20" },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Loading state for permissions */}
        {permissionsLoading ? (
          <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
        ) : (
          /* Top Navigation Tabs */
          <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "default" : "outline"}
                onClick={() => {
                  setActiveTab(tab.value);
                  setStatusFilter("all");
                }}
                className="gap-2"
                size="sm"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        )}

        {/* Compact Status Pills - Only show for clients tab */}
        {activeTab === "clients" && (
          <div className="flex flex-wrap gap-2 mb-4">
            {statusCards.map((card) => {
              const isActive = statusFilter === card.key;
              return (
                <Button
                  key={card.key}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(isActive ? "all" : card.key)}
                  className={cn(
                    "h-8 gap-1.5 px-3",
                    !isActive && card.color
                  )}
                >
                  <card.icon className="h-3.5 w-3.5" />
                  <span className="font-semibold">{card.count}</span>
                  <span>{card.label}</span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Clear Filter Button */}
        {statusFilter !== "all" && (
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
              Clear filter: {statusFilter.replace('_', ' ')}
            </Button>
          </div>
        )}

        {/* Content - All inline now */}
        {activeTab === "analytics" && (
          <TabErrorBoundary key={`analytics-${retryKey}`} tabName="Analytics" onRetry={handleTabRetry}>
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <AdminAnalyticsTab />
            </Suspense>
          </TabErrorBoundary>
        )}
        {activeTab === "bookings" && (
          <TabErrorBoundary key={`bookings-${retryKey}`} tabName="Bookings" onRetry={handleTabRetry}>
            <AdminBookingsTab />
          </TabErrorBoundary>
        )}
        {activeTab === "payments" && (
          <TabErrorBoundary key={`payments-${retryKey}`} tabName="Payments" onRetry={handleTabRetry}>
            <AdminPaymentsTab />
          </TabErrorBoundary>
        )}
        {activeTab === "fleet" && (
          <TabErrorBoundary key={`fleet-${retryKey}`} tabName="Fleet" onRetry={handleTabRetry}>
            <AdminFleetTab />
          </TabErrorBoundary>
        )}
        {activeTab === "cities" && (
          <TabErrorBoundary key={`cities-${retryKey}`} tabName="Cities" onRetry={handleTabRetry}>
            <AdminCitiesTab />
          </TabErrorBoundary>
        )}
        {activeTab === "clients" && (
          <TabErrorBoundary key={`clients-${retryKey}`} tabName="Clients" onRetry={handleTabRetry}>
            <AdminUnifiedClientsTab statusFilter={statusFilter} />
          </TabErrorBoundary>
        )}
        {activeTab === "business-clients" && (
          <TabErrorBoundary key={`business-clients-${retryKey}`} tabName="Business Clients" onRetry={handleTabRetry}>
            <AdminBusinessClientsTab />
          </TabErrorBoundary>
        )}
        {activeTab === "employees" && (
          <TabErrorBoundary key={`employees-${retryKey}`} tabName="Employees" onRetry={handleTabRetry}>
            <AdminEmployeesTab />
          </TabErrorBoundary>
        )}
        {activeTab === "email" && (
          <TabErrorBoundary key={`email-${retryKey}`} tabName="Email" onRetry={handleTabRetry}>
            <AdminEmailTestTab />
          </TabErrorBoundary>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPanel;
