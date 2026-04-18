"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Globe, Check } from "lucide-react";
import { COUNTRIES, countryFlag, getCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountryMultiSelectProps {
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function CountryMultiSelect({
  value,
  onChange,
  placeholder = "Select countries",
  className,
}: CountryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else {
      onChange([...value, code]);
    }
  };

  const removeOne = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((c) => c !== code));
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full min-h-10 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center gap-1.5 text-left transition-all hover:border-white/20",
          open && "border-[#00D26A]/50"
        )}
      >
        {value.length === 0 ? (
          <span className="flex items-center gap-2 text-xs text-neutral-500 px-1">
            <Globe className="w-3.5 h-3.5" />
            {placeholder}
          </span>
        ) : (
          value.map((code) => {
            const c = getCountry(code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#00D26A]/10 border border-[#00D26A]/20 text-[10px] font-bold text-[#00D26A]"
              >
                <span>{countryFlag(code)}</span>
                <span>{c ? c.name : code}</span>
                <button
                  type="button"
                  onClick={(e) => removeOne(code, e)}
                  className="hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })
        )}
      </button>

      {open && (
        <div className="absolute top-12 left-0 right-0 z-50 glass-card bg-black/95 border border-white/10 rounded-xl shadow-2xl max-h-72 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-white/5 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-neutral-600 focus:outline-none"
            />
          </div>

          <div className="overflow-y-auto flex-1 p-1">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-neutral-600 py-6">No matches</p>
            ) : (
              filtered.map((c) => {
                const selected = value.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggle(c.code)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all",
                      selected
                        ? "bg-[#00D26A]/10 text-[#00D26A]"
                        : "text-neutral-300 hover:bg-white/[0.03]"
                    )}
                  >
                    <span className="text-sm">{countryFlag(c.code)}</span>
                    <span className="flex-1 text-left font-medium">{c.name}</span>
                    <span className="text-[10px] text-neutral-600 font-mono">{c.code}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-[#00D26A] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
