import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const PageLoadingSkeleton = () => {
  const [showRefresh, setShowRefresh] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    // Show refresh option after 5 seconds
    const timer = setTimeout(() => setShowRefresh(true), 5000);
    
    // Track loading time
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="h-16 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between h-full px-4">
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      
      {/* Content skeleton - adaptive based on route type */}
      <div className="container px-4 py-8">
        {/* Page title */}
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-80 mb-8" />
        
        {/* Main content area */}
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
        
        {/* Show loading message and refresh option after timeout */}
        {showRefresh && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border rounded-lg p-6 max-w-sm mx-4 text-center space-y-4 shadow-lg">
              {/* Skeleton-style loading indicator */}
              <div className="flex justify-center gap-1">
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Taking longer than expected...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The page is still loading ({loadingTime}s). You can wait or try refreshing.
                </p>
              </div>
              <Button onClick={handleRefresh} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Booking history skeleton
export const BookingHistorySkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between h-full px-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="flex gap-4">
                <Skeleton className="w-32 h-32 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between h-full px-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
    <div className="container px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-6 mb-8">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Bike details skeleton
export const BikeDetailsSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between h-full px-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
    <div className="container px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <Skeleton className="h-80 w-full rounded-lg mb-4" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);
