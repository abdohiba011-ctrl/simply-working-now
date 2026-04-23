import { cn } from "@/lib/utils";

export interface SegmentTab {
  key: string;
  label: string;
}

interface SegmentedTabsProps {
  tabs: SegmentTab[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

export const SegmentedTabs = ({ tabs, value, onChange, className }: SegmentedTabsProps) => {
  return (
    <div className={cn("border-b border-border pb-4", className)}>
      <div className="scrollbar-hide flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all duration-150",
                active
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-transparent text-foreground/70 hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
