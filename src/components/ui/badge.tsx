import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        "status-new": "bg-blue-500/15 text-blue-700 border-blue-500/25 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/30",
        "status-pending": "bg-yellow-500/15 text-yellow-700 border-yellow-500/25 dark:bg-yellow-500/25 dark:text-yellow-300 dark:border-yellow-400/30",
        "status-confirmed": "bg-green-500/15 text-green-700 border-green-500/25 dark:bg-green-500/20 dark:text-green-300 dark:border-green-400/30",
        "status-active": "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/30",
        "status-completed": "bg-slate-500/15 text-slate-600 border-slate-500/25 dark:bg-slate-500/25 dark:text-slate-300 dark:border-slate-400/30",
        "status-cancelled": "bg-red-500/15 text-red-700 border-red-500/25 dark:bg-red-500/20 dark:text-red-300 dark:border-red-400/30",
        "status-rejected": "bg-red-500/15 text-red-700 border-red-500/25 dark:bg-red-500/20 dark:text-red-300 dark:border-red-400/30",
        "status-reviewed": "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/30",
        "status-verified": "bg-green-500/15 text-green-700 border-green-500/25 dark:bg-green-500/20 dark:text-green-300 dark:border-green-400/30",
        "status-blocked": "bg-red-900/15 text-red-800 border-red-900/25 dark:bg-red-900/25 dark:text-red-300 dark:border-red-700/30",
        "status-frozen": "bg-sky-500/15 text-sky-700 border-sky-500/25 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/30",
        "status-expired": "bg-gray-500/15 text-gray-700 border-gray-500/25 dark:bg-gray-500/25 dark:text-gray-300 dark:border-gray-400/30",
        "status-processing": "bg-indigo-500/15 text-indigo-700 border-indigo-500/25 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-400/30",
        "status-awaiting-payment": "bg-orange-500/15 text-orange-700 border-orange-500/25 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-400/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
