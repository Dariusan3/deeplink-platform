"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Convert a Date to a yyyy-mm-dd string in local time. Avoids the
// timezone shift you'd get from `.toISOString()` for users east of UTC.
function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Date Only Picker ───────────────────────────────────
interface DatePickerProps {
  value: string; // ISO date string or ""
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(value) : undefined;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex-1 h-10 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-left text-xs font-medium flex items-center gap-2 transition-all hover:border-white/20",
            open && "border-[#00D26A]/50",
            selected ? "text-white" : "text-neutral-500"
          )}
        >
          <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="flex-1 truncate">
            {selected ? format(selected, "MMM d, yyyy") : placeholder}
          </span>
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="w-8 h-10 flex items-center justify-center text-neutral-500 hover:text-white rounded-lg hover:bg-white/5 transition-all shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-12 left-0 z-50 glass-card bg-black/95 border border-white/10 rounded-xl p-3 shadow-2xl">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(day) => {
              onChange(day ? day.toISOString().split("T")[0] : "");
              setOpen(false);
            }}
            classNames={{
              root: "text-white text-xs",
              months: "",
              month_caption: "flex items-center justify-center py-1 mb-2",
              caption_label: "text-sm font-black text-white",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-2 top-3 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all",
              button_next: "absolute right-2 top-3 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all",
              weekdays: "flex",
              weekday: "w-8 h-8 flex items-center justify-center text-[9px] font-black text-neutral-500 uppercase",
              week: "flex",
              day: "w-8 h-8 flex items-center justify-center",
              day_button: "w-8 h-8 rounded-lg text-[11px] font-bold hover:bg-[#00D26A]/10 hover:text-[#00D26A] transition-all cursor-pointer",
              selected: "!bg-[#00D26A] !text-black font-black rounded-lg",
              today: "ring-1 ring-[#00D26A]/30 rounded-lg",
              outside: "text-neutral-700",
              disabled: "text-neutral-700 cursor-not-allowed",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── DateTime Picker (date + time) ──────────────────────
interface DateTimePickerProps {
  value: string; // ISO string or ""
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  // Earliest allowed date. Days before this are disabled in the calendar
  // and the combined date+time is clamped up when needed. Pass a Date; any
  // days strictly before the day-of-`minDate` are disabled.
  minDate?: Date;
}

export function DateTimePicker({ value, onChange, placeholder = "Pick date & time", className, minDate }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(value) : undefined;
  const [hour, setHour] = useState(selected ? selected.getHours() : 12);
  const [minute, setMinute] = useState(selected ? selected.getMinutes() : 0);

  // Normalize minDate to start-of-day so equal-day picks aren't blocked
  // by millisecond comparisons. Same-day clicks remain allowed; the
  // resulting datetime is clamped up to minDate if the hour/minute would
  // place it earlier.
  const minDay = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : undefined;

  useEffect(() => {
    if (selected) {
      setHour(selected.getHours());
      setMinute(selected.getMinutes());
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const dt = new Date(day);
    dt.setHours(hour, minute, 0, 0);
    // Clamp to minDate if picking the same day with an earlier time.
    if (minDate && dt < minDate) {
      const clamp = new Date(minDate);
      setHour(clamp.getHours());
      setMinute(clamp.getMinutes());
      onChange(clamp.toISOString());
      return;
    }
    onChange(dt.toISOString());
  };

  const handleTimeChange = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    if (selected) {
      const dt = new Date(selected);
      dt.setHours(h, m, 0, 0);
      if (minDate && dt < minDate) {
        // Time puts us before minDate — snap to minDate.
        const clamp = new Date(minDate);
        setHour(clamp.getHours());
        setMinute(clamp.getMinutes());
        onChange(clamp.toISOString());
        return;
      }
      onChange(dt.toISOString());
    }
  };

  const formatHour12 = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex-1 h-10 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-left text-xs font-medium flex items-center gap-2 transition-all hover:border-white/20",
            open && "border-[#00D26A]/50",
            selected ? "text-white" : "text-neutral-500"
          )}
        >
          <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="flex-1 truncate">
            {selected ? `${format(selected, "MMM d, yyyy")} at ${formatHour12(hour)}` : placeholder}
          </span>
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="w-8 h-10 flex items-center justify-center text-neutral-500 hover:text-white rounded-lg hover:bg-white/5 transition-all shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-12 left-0 z-50 glass-card bg-black/95 border border-white/10 rounded-xl p-3 shadow-2xl">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleDaySelect}
            disabled={minDay ? { before: minDay } : undefined}
            classNames={{
              root: "text-white text-xs",
              months: "",
              month_caption: "flex items-center justify-center py-1 mb-2",
              caption_label: "text-sm font-black text-white",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-2 top-3 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all",
              button_next: "absolute right-2 top-3 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all",
              weekdays: "flex",
              weekday: "w-8 h-8 flex items-center justify-center text-[9px] font-black text-neutral-500 uppercase",
              week: "flex",
              day: "w-8 h-8 flex items-center justify-center",
              day_button: "w-8 h-8 rounded-lg text-[11px] font-bold hover:bg-[#00D26A]/10 hover:text-[#00D26A] transition-all cursor-pointer",
              selected: "!bg-[#00D26A] !text-black font-black rounded-lg",
              today: "ring-1 ring-[#00D26A]/30 rounded-lg",
              outside: "text-neutral-700",
              disabled: "text-neutral-700 cursor-not-allowed",
            }}
          />

          {/* Time picker */}
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Time</span>
            <select
              value={hour}
              onChange={(e) => handleTimeChange(Number(e.target.value), minute)}
              className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
            >
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h} className="bg-neutral-900">
                  {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                </option>
              ))}
            </select>
            <span className="text-neutral-500 font-bold">:</span>
            <select
              value={minute}
              onChange={(e) => handleTimeChange(hour, Number(e.target.value))}
              className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <option key={m} value={m} className="bg-neutral-900">
                  {m.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Date Range Picker ──────────────────────────────────
// Single popover that shows TWO months side-by-side (react-day-picker
// `numberOfMonths={2}`) and lets the user pick a start + end date in one
// flow. First click = start, second click = end. Auto-closes after both
// are picked. Quick presets on the side for common ranges.

interface DateRangePickerProps {
  from: string;            // ISO yyyy-mm-dd or ""
  to: string;              // ISO yyyy-mm-dd or ""
  onChange: (range: { from: string; to: string }) => void;
  placeholder?: string;
  className?: string;
  // Open the calendar popover immediately on mount. Useful when this
  // picker only appears in a "custom range" mode — no reason to make
  // the user click twice.
  defaultOpen?: boolean;
}

// Build a [from, to] tuple from a preset key. Computed at click time so
// "Today" / "This Month" always refer to "now", not when the picker was
// mounted.
type PresetKey =
  | "today"
  | "yesterday"
  | "last_7"
  | "last_30"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "all_time";

function computePreset(key: PresetKey): { from: Date; to: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const end = new Date(today);
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const d = new Date(today); d.setDate(d.getDate() - 1);
      return { from: d, to: d };
    }
    case "last_7":
      start.setDate(start.getDate() - 6);
      return { from: start, to: end };
    case "last_30":
      start.setDate(start.getDate() - 29);
      return { from: start, to: end };
    case "this_month":
      start.setDate(1);
      return { from: start, to: end };
    case "last_month": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0); // last day of prev month
      return { from: s, to: e };
    }
    case "last_3_months":
      start.setMonth(start.getMonth() - 3);
      return { from: start, to: end };
    case "last_6_months":
      start.setMonth(start.getMonth() - 6);
      return { from: start, to: end };
    case "this_year":
      return { from: new Date(today.getFullYear(), 0, 1), to: end };
    case "all_time":
      // Wide-open window — 5 years back is plenty for Tappr data so far.
      return {
        from: new Date(today.getFullYear() - 5, 0, 1),
        to: end,
      };
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today",          label: "Today" },
  { key: "yesterday",      label: "Yesterday" },
  { key: "last_7",         label: "Last 7 Days" },
  { key: "last_30",        label: "Last 30 Days" },
  { key: "this_month",     label: "This Month" },
  { key: "last_month",     label: "Last Month" },
  { key: "last_3_months",  label: "Last 3 Months" },
  { key: "last_6_months",  label: "Last 6 Months" },
  { key: "this_year",      label: "This Year" },
  { key: "all_time",       label: "All Time" },
];

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Pick a date range",
  className,
  defaultOpen = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  // Pending range edited inside the popover — committed to the parent
  // only when the user clicks Apply (or picks a preset). Mirrors the
  // applied range whenever the picker re-opens, so partial edits don't
  // leak between sessions.
  const [pendingFrom, setPendingFrom] = useState<Date | undefined>(
    from ? new Date(from + "T00:00:00") : undefined
  );
  const [pendingTo, setPendingTo] = useState<Date | undefined>(
    to ? new Date(to + "T00:00:00") : undefined
  );
  const [activePreset, setActivePreset] = useState<PresetKey | "custom">("custom");

  useEffect(() => {
    if (open) {
      setPendingFrom(from ? new Date(from + "T00:00:00") : undefined);
      setPendingTo(to ? new Date(to + "T00:00:00") : undefined);
      setActivePreset("custom");
    }
  }, [open, from, to]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pendingRange: DateRange | undefined =
    pendingFrom || pendingTo ? { from: pendingFrom, to: pendingTo } : undefined;

  const appliedRange =
    from || to
      ? {
          from: from ? new Date(from + "T00:00:00") : undefined,
          to: to ? new Date(to + "T00:00:00") : undefined,
        }
      : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    setActivePreset("custom");
    setPendingFrom(range?.from);
    setPendingTo(range?.to);
  };

  const choosePreset = (key: PresetKey) => {
    const { from: f, to: t } = computePreset(key);
    setPendingFrom(f);
    setPendingTo(t);
    setActivePreset(key);
  };

  const apply = () => {
    if (!pendingFrom) return;
    onChange({
      from: toLocalIsoDate(pendingFrom),
      to: toLocalIsoDate(pendingTo ?? pendingFrom),
    });
    setOpen(false);
  };

  const clearAll = () => {
    setPendingFrom(undefined);
    setPendingTo(undefined);
    setActivePreset("custom");
    onChange({ from: "", to: "" });
  };

  const buttonLabel = (() => {
    if (appliedRange?.from && appliedRange?.to) {
      return `${format(appliedRange.from, "MMM d")} → ${format(appliedRange.to, "MMM d, yyyy")}`;
    }
    if (appliedRange?.from) {
      return `${format(appliedRange.from, "MMM d, yyyy")} → …`;
    }
    return placeholder;
  })();

  const footerLabel = (() => {
    const fmt = (d: Date) => format(d, "MM/dd/yyyy");
    if (pendingFrom && pendingTo) return `${fmt(pendingFrom)} - ${fmt(pendingTo)}`;
    if (pendingFrom) return `${fmt(pendingFrom)} - …`;
    return "Pick a start and end date";
  })();

  return (
    <div className={cn("relative", className)} ref={ref}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex-1 h-10 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-left text-xs font-medium flex items-center gap-2 transition-all hover:border-white/20",
            open && "border-[#00D26A]/50",
            appliedRange?.from ? "text-white" : "text-neutral-500"
          )}
        >
          <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="flex-1 truncate">{buttonLabel}</span>
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={clearAll}
            className="w-8 h-10 flex items-center justify-center text-neutral-500 hover:text-white rounded-lg hover:bg-white/5 transition-all shrink-0"
            title="Clear date range"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-12 right-0 z-50 glass-card bg-black/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-[760px]">
          <div className="flex">
            {/* Preset rail */}
            <div className="flex flex-col py-3 border-r border-white/5 w-[170px] shrink-0">
              {PRESETS.map((p) => {
                const active = activePreset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => choosePreset(p.key)}
                    className={cn(
                      "text-left px-5 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-[#00D26A]/10 text-[#00D26A] font-bold border-l-2 border-[#00D26A]"
                        : "text-neutral-300 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setActivePreset("custom")}
                className={cn(
                  "text-left px-5 py-2 text-sm font-medium transition-all mt-1",
                  activePreset === "custom"
                    ? "bg-[#00D26A]/10 text-[#00D26A] font-bold border-l-2 border-[#00D26A]"
                    : "text-neutral-300 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent"
                )}
              >
                Custom Range
              </button>
            </div>

            {/* Calendar */}
            <div className="flex-1 p-4">
              <DayPicker
                mode="range"
                numberOfMonths={2}
                selected={pendingRange}
                onSelect={handleSelect}
                classNames={{
                  root: "text-white text-xs",
                  months: "flex gap-6",
                  month: "relative",
                  month_caption: "flex items-center justify-center py-1 mb-3",
                  caption_label: "text-sm font-black text-white",
                  nav: "flex items-center gap-1",
                  button_previous: "absolute left-1 top-2 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all z-10",
                  button_next: "absolute right-1 top-2 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all z-10",
                  weekdays: "flex",
                  weekday: "w-9 h-7 flex items-center justify-center text-[10px] font-black text-neutral-500 uppercase",
                  week: "flex",
                  day: "w-9 h-9 flex items-center justify-center text-white",
                  day_button: "w-8 h-8 rounded-full text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center",
                  // Range middle — light green tint background with WHITE
                  // number so the day digits stay readable. Put before
                  // selected so range_start/end (which also get selected)
                  // win on the bookends.
                  range_middle: "!bg-[#00D26A]/20 [&_button]:!bg-transparent [&_button]:!text-white [&_button]:!font-bold [&_button]:rounded-none",
                  // Bookends — solid green pill with WHITE bold number so
                  // the digit stays visible against the green fill.
                  selected: "[&_button]:!bg-[#00D26A] [&_button]:!text-white [&_button]:!font-black [&_button]:!rounded-full [&_button]:shadow-[0_0_15px_rgba(0,210,106,0.35)]",
                  range_start: "[&_button]:!rounded-full",
                  range_end: "[&_button]:!rounded-full",
                  today: "[&_button]:ring-1 [&_button]:ring-[#00D26A]/40",
                  outside: "[&_button]:!text-neutral-700",
                  disabled: "[&_button]:!text-neutral-800 [&_button]:cursor-not-allowed",
                }}
              />
            </div>
          </div>

          {/* Footer — pending range readout + Clear / Apply */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.01]">
            <p className={cn(
              "text-xs font-mono tabular-nums",
              pendingFrom ? "text-white" : "text-neutral-500"
            )}>
              {footerLabel}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="h-8 px-4 rounded-lg text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!pendingFrom}
                className="h-8 px-5 rounded-lg bg-[#00D26A] hover:bg-[#00D26A]/90 text-black text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
