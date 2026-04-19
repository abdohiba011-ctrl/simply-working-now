import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in", className)}>
      {/* Illustrated Icon Container */}
      <div className="relative mb-6">
        {/* Background circles for depth */}
        <div className="absolute inset-0 -m-4 rounded-full bg-secondary/30 animate-pulse" />
        <div className="absolute inset-0 -m-2 rounded-full bg-secondary/50" />
        <div className="relative w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary/20" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-primary/30" />
      </div>

      {/* Content */}
      <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">{description}</p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button variant="hero" onClick={onAction} className="animate-scale-in">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
