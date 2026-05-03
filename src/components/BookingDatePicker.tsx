import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, RotateCcw, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface BookingDatePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  triggerClassName?: string;
  placeholder?: string;
  align?: "start" | "center" | "end";
  /** When true, render only the inline panel (no trigger). Used when host opens it. */
  panelOnly?: boolean;
}

const today0 = () => startOfDay(new Date());

const Panel = ({
  range,
  setRange,
  focus,
  setFocus,
  isMobile,
  onClose,
}: {
  range: DateRange | undefined;
  setRange: (r: DateRange | undefined) => void;
  focus: "from" | "to";
  setFocus: (f: "from" | "to") => void;
  isMobile: boolean;
  onClose: () => void;
}) => {
  const days = range?.from && range?.to ? differenceInDays(range.to, range.from) : 0;

  const handleSelect = (next: DateRange | undefined) => {
    // The DayPicker fires with various shapes — implement custom logic so the
    // currently focused box (Pickup/Return) controls assignment.
    if (!next) {
      setRange(undefined);
      setFocus("from");
      return;
    }

    // Determine the date the user just clicked.
    const prev = range;
    let clicked: Date | undefined;
    if (next.from && (!prev?.from || next.from.getTime() !== prev.from.getTime())) {
      clicked = next.from;
    } else if (next.to && (!prev?.to || next.to.getTime() !== prev.to.getTime())) {
      clicked = next.to;
    } else {
      clicked = next.from;
    }
    if (!clicked) return;

    if (focus === "from") {
      if (prev?.to) {
        const normalized = isBefore(clicked, prev.to)
          ? { from: clicked, to: prev.to }
          : { from: prev.to, to: clicked };
        setRange(normalized);
        window.setTimeout(() => onClose(), 280);
        return;
      }
      setRange({ from: clicked, to: undefined });
      setFocus("to");
      return;
    }

    // focus === "to"
    if (!prev?.from) {
      setRange({ from: clicked, to: undefined });
      setFocus("to");
      return;
    }
    const normalized = isBefore(clicked, prev.from)
      ? { from: clicked, to: prev.from }
      : { from: prev.from, to: clicked };
    setRange(normalized);
    window.setTimeout(() => onClose(), 280);
  };

  const handleReset = () => {
    setRange(undefined);
    setFocus("from");
  };

  return (
    <div className="bg-white text-[#163300] rounded-2xl shadow-xl overflow-hidden">
      {/* Pickup / Return header boxes */}
      <div className="grid grid-cols-2 gap-2 p-2 border-b border-[#163300]/10">
        <button
          type="button"
          onClick={() => setFocus("from")}
          className={cn(
            "rounded-lg border-2 px-2.5 py-1.5 text-left transition-colors",
            focus === "from"
              ? "border-[#9FE870] bg-[#9FE870]/10"
              : "border-[#163300]/15 bg-white hover:border-[#163300]/40",
          )}
        >
          <div className="text-[10px] font-semibold tracking-wider uppercase text-[#163300]/60 leading-tight">
            Pickup
          </div>
          <div className="text-[13px] font-semibold leading-tight mt-0.5">
            {range?.from ? format(range.from, "MMM d, yyyy") : "Select"}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setFocus("to")}
          className={cn(
            "rounded-lg border-2 px-2.5 py-1.5 text-left transition-colors",
            focus === "to"
              ? "border-[#9FE870] bg-[#9FE870]/10"
              : "border-[#163300]/15 bg-white hover:border-[#163300]/40",
          )}
        >
          <div className="text-[10px] font-semibold tracking-wider uppercase text-[#163300]/60 leading-tight">
            Return
          </div>
          <div className="text-[13px] font-semibold leading-tight mt-0.5">
            {range?.to ? format(range.to, "MMM d, yyyy") : "Select"}
          </div>
        </button>
      </div>

      <div className="p-1.5">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : 2}
          weekStartsOn={0}
          disabled={(d) => d < today0()}
          className="pointer-events-auto p-2 w-full"
        />
      </div>

      {/* Long-rental warning */}
      {days > 30 && (
        <div className="px-3 pb-1.5 text-[11px] text-amber-700">
          Long rental — confirm dates with the agency after booking.
        </div>
      )}

      {/* Footer: legend + reset (compact 32px) */}
      <div className="flex items-center justify-between gap-3 px-3 h-8 border-t border-[#163300]/10 text-[11px]">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-[#163300]/70 hover:text-[#163300] font-medium"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
        <div className="flex items-center gap-3 text-[#163300]/70">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full ring-2 ring-[#333] ring-inset" />
            Today
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#9FE870]" />
            Selected
          </span>
        </div>
      </div>

      {isMobile && (
        <div className="px-3 pt-2 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-lg bg-[#9FE870] text-[#163300] font-semibold text-base hover:bg-[#8DD85F] active:bg-[#7BC850] transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export const BookingDatePicker = ({
  value,
  onChange,
  triggerClassName,
  placeholder = "Pick-up → Return",
  align = "start",
  panelOnly = false,
}: BookingDatePickerProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(value);
  const [focus, setFocus] = useState<"from" | "to">("from");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setTempRange(value), [value]);

  // Close on outside click (desktop popover only). Use closest() against a
  // data-attribute on the portal wrapper so re-renders inside the calendar
  // don't accidentally trigger close.
  useEffect(() => {
    if (!open || isMobile) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest?.('[data-booking-datepicker="panel"]')) return;
      if (triggerRef.current?.contains(t as Node)) return;
      commitAndClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") commitAndClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);

  // Position the desktop popover (position: fixed → viewport coords, no scroll offset)
  useEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;
    const compute = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const width = Math.min(560, window.innerWidth - 16);
      let left = rect.left;
      if (align === "center") left = rect.left + rect.width / 2 - width / 2;
      if (align === "end") left = rect.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

      const estPanelHeight = 520;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const top = spaceBelow >= estPanelHeight || spaceBelow >= spaceAbove
        ? rect.bottom + 8
        : Math.max(8, rect.top - estPanelHeight - 8);
      setPopoverPos({ top, left });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, isMobile, align]);

  const commitAndClose = () => {
    if (tempRange?.from && tempRange?.to) {
      onChange(tempRange);
    } else {
      // revert half-selection
      setTempRange(value);
    }
    setOpen(false);
  };

  const handleOpen = () => {
    setTempRange(value);
    setFocus(value?.from && !value?.to ? "to" : "from");
    setOpen(true);
  };

  const handleChange = (r: DateRange | undefined) => {
    setTempRange(r);
    if (r?.from && r?.to) {
      // Apply immediately and close shortly after (panel handles the timing)
      onChange(r);
    }
  };

  const label = value?.from && value?.to
    ? `${format(value.from, "MMM d")} → ${format(value.to, "MMM d")}`
    : value?.from
      ? `${format(value.from, "MMM d")} → ...`
      : placeholder;

  return (
    <>
      {!panelOnly && (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className={cn(
            "h-12 w-full rounded-md border-2 bg-white px-3 text-left text-sm flex items-center justify-between gap-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !value?.from && "text-muted-foreground",
            triggerClassName,
          )}
          aria-label="Pick rental dates"
        >
          <span className="truncate">{label}</span>
          <CalendarIcon className="h-4 w-4 opacity-60 shrink-0" />
        </button>
      )}

      {/* Desktop modal popup via portal */}
      {open && !isMobile &&
        createPortal(
          <div
            data-booking-datepicker="overlay"
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) commitAndClose();
            }}
          >
            <div
              ref={popoverRef}
              data-booking-datepicker="panel"
              className="w-full max-w-[600px] max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-12 border-b border-[#163300]/10 shrink-0">
                <h2 className="text-sm font-semibold text-[#163300]">Select Date</h2>
                <button
                  type="button"
                  onClick={commitAndClose}
                  aria-label="Close"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full text-[#163300] hover:bg-[#163300]/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto">
                <Panel
                  range={tempRange}
                  setRange={handleChange}
                  focus={focus}
                  setFocus={setFocus}
                  isMobile={false}
                  onClose={() => setOpen(false)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Mobile bottom sheet */}
      {isMobile && (
        <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : commitAndClose())}>
          <SheetContent
            side="bottom"
            className="p-0 inset-x-0 bottom-0 w-full max-w-full max-h-[85vh] rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0 bg-white text-[#163300] [&>button]:hidden overflow-hidden"
          >
            <div className="flex flex-col max-h-[85vh]">
              <div className="flex justify-center pt-3 pb-2 shrink-0">
                <span className="h-1 w-10 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 overflow-y-auto px-0 pb-3">
                <Panel
                  range={tempRange}
                  setRange={handleChange}
                  focus={focus}
                  setFocus={setFocus}
                  isMobile
                  onClose={commitAndClose}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
