import { Skeleton } from "@/components/ui/skeleton";

/**
 * Affiliate page-specific skeleton loader
 * Matches the actual structure of the Affiliate page
 */
export const AffiliateSkeleton = () => (
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

    {/* Hero Section */}
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-14 w-full max-w-2xl mx-auto" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-12 w-48 mx-auto" />
        </div>

        {/* Stats Grid - 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-16">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-6 text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-3" />
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How It Works - 4 steps */}
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
        
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-6">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mx-auto mt-1" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Features - 4 cards in 2x2 grid */}
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <Skeleton className="h-10 w-48 mx-auto" />
            <Skeleton className="h-5 w-80 mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg border p-6">
                <Skeleton className="h-10 w-10 mb-3" />
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Earnings Calculator - 1 card */}
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <Skeleton className="h-10 w-56 mx-auto" />
            <Skeleton className="h-5 w-72 mx-auto" />
          </div>

          <div className="bg-card rounded-lg border-2 p-6 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center border-b pb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
            <div className="bg-primary/10 rounded-lg p-6 text-center">
              <Skeleton className="h-4 w-40 mx-auto mb-2" />
              <Skeleton className="h-12 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);
