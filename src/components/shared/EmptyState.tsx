import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  children?: ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action, className, children }: Props) => (
  <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
    {Icon && (
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
    )}
    <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
    {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && (
      <Button onClick={action.onClick} className="mt-6">
        {action.label}
      </Button>
    )}
    {children}
  </div>
);
