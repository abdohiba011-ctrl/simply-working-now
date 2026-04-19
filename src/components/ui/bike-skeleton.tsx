import { Skeleton } from "@/components/ui/skeleton";

export const BikeCardSkeleton = () => {
  return (
    <div className="relative group overflow-hidden rounded-xl border-2 border-border bg-background animate-pulse">
      {/* Price Badge Skeleton */}
      <div className="absolute top-0 left-0 z-10">
        <Skeleton className="h-6 w-20 rounded-none" />
      </div>

      {/* Bike Image Skeleton */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted p-2">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
      
      {/* Bike Name Skeleton */}
      <div className="p-3 border-t border-border bg-muted/50">
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    </div>
  );
};

export const BikeListCardSkeleton = () => {
  return (
    <div className="rounded-xl border-2 border-border bg-background overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="aspect-[4/3] bg-muted p-4">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>

      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
};

export const BikeTypeSkeleton = ({ count = 4 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-6 w-24 ml-auto" />
          <Skeleton className="h-8 w-28 ml-auto" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <BikeListCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const HeroSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <BikeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const BookingCardSkeleton = () => {
  return (
    <div className="rounded-xl border-2 border-border bg-background p-6 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Image Skeleton */}
        <Skeleton className="w-full sm:w-32 h-32 rounded-lg" />
        
        {/* Content Skeleton */}
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-10 w-full rounded border" />
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationSkeleton = () => {
  return (
    <div className="p-4 rounded-lg border border-l-4 border-l-muted bg-background animate-pulse">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationListSkeleton = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
};

export const VerificationSkeleton = () => {
  return (
    <div className="space-y-6 p-4 animate-pulse">
      {/* Header */}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      
      {/* Status Card */}
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      
      {/* Upload sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const CheckoutSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        
        {/* Booking Summary */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-4">
            <Skeleton className="h-24 w-24 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        
        {/* Form */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        
        {/* Submit Button */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
};

export const SavedLocationsSkeleton = () => {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
};

export const TimelineSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DialogContentSkeleton = () => {
  return (
    <div className="space-y-4 py-4 animate-pulse">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
};

export const ProtectedRouteSkeleton = () => {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Image Loading Skeleton (for image viewer/lightbox)
export const ImageLoadingSkeleton = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <div className="h-16 w-16 rounded-lg bg-white/10 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      </div>
    </div>
  );
};

// Image Compression Indicator
export const ImageCompressingIndicator = () => {
  return (
    <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg bg-muted/30">
      <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
      <span className="text-xs text-muted-foreground mt-2">Compressing...</span>
    </div>
  );
};

// Individual Owner Applications Skeleton
export const IndividualOwnerApplicationsSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};
