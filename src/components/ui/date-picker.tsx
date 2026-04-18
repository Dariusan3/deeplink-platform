"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
