import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-3 sm:gap-4 w-full",
        month: "space-y-2 flex-1 min-w-0 w-full",
        caption: "flex justify-center py-2 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground rounded-md flex-1 min-w-0 font-normal text-[10px] py-0.5 text-center",
        row: "flex w-full mt-1",
        cell: "flex-1 min-w-0 aspect-square text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected].day-range-start)]:rounded-l-full [&:has([aria-selected].day-outside)]:bg-[#9FE870]/20 [&:has([aria-selected])]:bg-[#9FE870]/20 first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-full w-full p-0 font-normal text-xs aria-selected:opacity-100 hover:bg-[#9FE870]/30"),
        day_range_start: "day-range-start !bg-[#9FE870] !text-[#163300] font-semibold rounded-full hover:!bg-[#9FE870]",
        day_range_end: "day-range-end !bg-[#9FE870] !text-[#163300] font-semibold rounded-full hover:!bg-[#9FE870]",
        day_selected:
          "!bg-[#9FE870] !text-[#163300] font-semibold rounded-full hover:!bg-[#9FE870]",
        day_today: "!bg-transparent !text-foreground font-semibold ring-2 ring-[#333333] ring-inset rounded-full",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-[#9FE870]/20 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-40 line-through",
        day_range_middle: "aria-selected:!bg-[#9FE870]/20 aria-selected:!text-[#163300] !rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
