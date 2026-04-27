import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TRACKED_ROLES = ["admin", "agency", "business", "user"] as const;

interface Props {
  className?: string;
  compact?: boolean;
}

/**
 * Visualizes which roles are loaded for the current user from the
 * `user_roles` table. A green pill = role active, gray = absent.
 * The refresh button forces a re-fetch + sync of the auth store.
 */
export const RoleStatusIndicator = ({ className, compact }: Props) => {
  const { userRoles, refreshRoles, isRefreshingRoles, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className={cn("px-2 py-1.5", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Role status
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            refreshRoles();
          }}
          disabled={isRefreshingRoles}
          className="p-1 rounded hover:bg-muted disabled:opacity-50"
          aria-label="Refresh roles"
        >
          <RefreshCw className={cn("h-3 w-3 text-muted-foreground", isRefreshingRoles && "animate-spin")} />
        </button>
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-wrap gap-1">
          {TRACKED_ROLES.map((role) => {
            const active = userRoles.includes(role);
            return (
              <Tooltip key={role}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                      active
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        active ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    {role}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {active ? `Loaded from user_roles: ${role}` : `Not assigned: ${role}`}
                </TooltipContent>
              </Tooltip>
            );
          })}
          {compact ? null : userRoles.length === 0 && (
            <span className="text-[10px] text-muted-foreground italic">No roles loaded</span>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};
