import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("rounded-xl border bg-card p-6 shadow-sm", className)}>
    <Skeleton className="h-4 w-24" />
    <Skeleton className="mt-4 h-8 w-32" />
    <Skeleton className="mt-3 h-3 w-20" />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-6 w-20 rounded-full" />
  </div>
);
