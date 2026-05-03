export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface DayHours {
  open: boolean;
  from: string; // "HH:MM"
  to: string; // "HH:MM"
}

export type WorkingHours = Record<DayKey, DayHours>;

export const DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const SHORT: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { open: true, from: "09:00", to: "19:00" },
  tuesday: { open: true, from: "09:00", to: "19:00" },
  wednesday: { open: true, from: "09:00", to: "19:00" },
  thursday: { open: true, from: "09:00", to: "19:00" },
  friday: { open: true, from: "09:00", to: "19:00" },
  saturday: { open: true, from: "09:00", to: "19:00" },
  sunday: { open: true, from: "10:00", to: "18:00" },
};

// JS getDay(): 0=Sun..6=Sat
export const dayKeyFromDate = (d: Date): DayKey => {
  const map: DayKey[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[d.getDay()];
};

export const isClosedOnDate = (wh: WorkingHours | null | undefined, d: Date): boolean => {
  if (!wh) return false;
  const day = wh[dayKeyFromDate(d)];
  return !!day && day.open === false;
};

export const TIME_SLOTS_30 = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

export const slotsBetween = (from: string, to: string): string[] =>
  TIME_SLOTS_30.filter((t) => t >= from && t <= to);

export const allDaysClosed = (wh: WorkingHours | null | undefined): boolean => {
  if (!wh) return false;
  return DAY_KEYS.every((k) => wh[k]?.open === false);
};

/** Group consecutive days with identical hours for display, e.g. "Mon-Fri: 09:00-19:00". */
export const formatWorkingHoursSummary = (
  wh: WorkingHours | null | undefined,
): { label: string; value: string }[] => {
  if (!wh) return [];
  if (allDaysClosed(wh)) return [{ label: "Hours", value: "Not set" }];

  const sig = (k: DayKey) => {
    const d = wh[k];
    if (!d || d.open === false) return "CLOSED";
    return `${d.from}-${d.to}`;
  };

  const allSame = DAY_KEYS.every((k) => sig(k) === sig("monday"));
  if (allSame) {
    const s = sig("monday");
    return [{ label: "Daily", value: s === "CLOSED" ? "Closed" : s.replace("-", " - ") }];
  }

  const out: { label: string; value: string }[] = [];
  let i = 0;
  while (i < DAY_KEYS.length) {
    const start = i;
    const s = sig(DAY_KEYS[i]);
    while (i + 1 < DAY_KEYS.length && sig(DAY_KEYS[i + 1]) === s) i++;
    const label =
      start === i
        ? SHORT[DAY_KEYS[start]]
        : `${SHORT[DAY_KEYS[start]]}-${SHORT[DAY_KEYS[i]]}`;
    out.push({ label, value: s === "CLOSED" ? "Closed" : s.replace("-", " - ") });
    i++;
  }
  return out;
};

export const normalizeWorkingHours = (raw: unknown): WorkingHours => {
  const base = { ...DEFAULT_WORKING_HOURS };
  if (raw && typeof raw === "object") {
    for (const k of DAY_KEYS) {
      const v = (raw as any)[k];
      if (v && typeof v === "object") {
        base[k] = {
          open: v.open !== false,
          from: typeof v.from === "string" ? v.from : "09:00",
          to: typeof v.to === "string" ? v.to : "19:00",
        };
      }
    }
  }
  return base;
};
