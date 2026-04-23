import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for the Refer-a-Friend page (`/affiliate`).
 * Mirrors the new 6-section structure: hero, how-it-works (3),
 * benefits (4), credit explainer, FAQ, final CTA.
 */
export const AffiliateSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header */}
    <div className="h-16 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between h-full px-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>

    {/* Hero */}
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-[900px] mx-auto text-center space-y-5">
          <Skeleton className="h-6 w-32 mx-auto rounded-full" />
          <Skeleton className="h-12 w-full max-w-2xl mx-auto" />
          <Skeleton className="h-5 w-3/4 mx-auto" />
          <Skeleton className="h-11 w-56 mx-auto rounded-md" />
        </div>
      </div>
    </section>

    {/* How it works — 3 cards */}
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 space-y-3">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Benefits — 4 cards in 2x2 */}
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <Skeleton className="h-8 w-48 mx-auto mb-10" />
        <div className="grid md:grid-cols-2 gap-6 max-w-[1100px] mx-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Credit explainer */}
    <section className="py-12 md:py-16 bg-muted">
      <div className="container mx-auto px-4">
        <Skeleton className="h-8 w-72 mx-auto mb-10" />
        <div className="grid md:grid-cols-2 gap-10 max-w-[1100px] mx-auto">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-56 w-full max-w-sm mx-auto rounded-2xl" />
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-[800px] mx-auto space-y-3">
          <Skeleton className="h-8 w-64 mx-auto mb-6" />
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </section>

    {/* Final CTA */}
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 text-center space-y-4">
        <Skeleton className="h-10 w-80 mx-auto" />
        <Skeleton className="h-5 w-96 mx-auto" />
        <Skeleton className="h-11 w-56 mx-auto rounded-md" />
      </div>
    </section>
  </div>
);
