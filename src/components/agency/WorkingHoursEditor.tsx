import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DAY_KEYS,
  DAY_LABELS,
  DEFAULT_WORKING_HOURS,
  TIME_SLOTS_30,
  type DayKey,
  type WorkingHours,
} from "@/lib/workingHours";
import { AlertTriangle } from "lucide-react";

interface Props {
  value: WorkingHours | null;
  onChange: (next: WorkingHours) => void;
}

export const WorkingHoursEditor = ({ value, onChange }: Props) => {
  const wh: WorkingHours = value || DEFAULT_WORKING_HOURS;

  const updateDay = (day: DayKey, patch: Partial<WorkingHours[DayKey]>) => {
    onChange({ ...wh, [day]: { ...wh[day], ...patch } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Working Hours</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          When can renters pick up and return bikes?
        </p>
      </div>

      <div className="space-y-2">
        {DAY_KEYS.map((day) => {
          const d = wh[day];
          const invalid = d.open && d.from >= d.to;
          return (
            <div key={day} className="flex flex-wrap items-center gap-3 py-1.5">
              <div className="w-28 text-sm font-medium">{DAY_LABELS[day]}</div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={d.open}
                  onCheckedChange={(v) => updateDay(day, { open: !!v })}
                />
                <span>{d.open ? "Open" : "Closed"}</span>
              </label>
              {d.open && (
                <>
                  <Select value={d.from} onValueChange={(v) => updateDay(day, { from: v })}>
                    <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      {TIME_SLOTS_30.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">to</span>
                  <Select value={d.to} onValueChange={(v) => updateDay(day, { to: v })}>
                    <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      {TIME_SLOTS_30.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {invalid && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> End must be after start
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
