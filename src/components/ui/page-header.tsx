import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Single source of truth for in-content page titles across the partner
// and admin dashboards. One canonical look so every page reads the same:
//   eyebrow (accent, uppercase, tracked)
//   title   (3xl, black, italic, uppercase, tight)
//   subtitle (neutral, regular)
// Plus an optional leading icon and an optional right-aligned action slot.
// `accent` switches the eyebrow/icon colour — green is the app default,
// purple is used to give the Partner section its own identity.
const ACCENTS = {
  green:  { text: "text-[#00D26A]", iconBg: "bg-[#00D26A]/10 border-[#00D26A]/20" },
  purple: { text: "text-[#A855F7]", iconBg: "bg-[#A855F7]/10 border-[#A855F7]/20" },
} as const;

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  action,
  className,
  accent = "green",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  action?: ReactNode;
  className?: string;
  accent?: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border",
            a.iconBg,
            iconClassName
          )}>
            <Icon className={cn("w-5 h-5", a.text)} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-1", a.text)}>
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
