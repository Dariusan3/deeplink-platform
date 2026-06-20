import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Single source of truth for in-content page titles across the partner
// and admin dashboards. One canonical look so every page reads the same:
//   eyebrow (green, uppercase, tracked)
//   title   (3xl, black, italic, uppercase, tight)
//   subtitle (neutral, regular)
// Plus an optional leading icon and an optional right-aligned action slot
// (button, etc.). Keeps headers from drifting page to page.
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#00D26A]/10 border border-[#00D26A]/20",
            iconClassName
          )}>
            <Icon className="w-5 h-5 text-[#00D26A]" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1.5 font-medium">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
