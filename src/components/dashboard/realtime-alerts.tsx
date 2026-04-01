"use client";

import { useAnomalyAlerts } from "@/hooks/use-anomaly-alerts";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  X,
  Sparkles,
  Bell,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export function RealtimeAlerts() {
  const { highSeverityUnread, alerts, unreadCount, dismiss, markAsRead } = useAnomalyAlerts();

  // Show max 3 most recent unread alerts on dashboard
  const visibleAlerts = alerts.filter((a) => !a.is_read).slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
            Live Alerts
          </h3>
          {unreadCount > 3 && (
            <span className="text-[9px] font-bold text-neutral-500">
              +{unreadCount - 3} more
            </span>
          )}
        </div>
        <Link
          href="/dashboard/alerts"
          className="text-[9px] font-black uppercase tracking-widest text-[#00D26A] hover:underline flex items-center gap-1"
        >
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "relative rounded-xl border p-3 flex items-start gap-3 transition-all",
            alert.severity === "high"
              ? "border-red-500/20 bg-red-500/5"
              : alert.severity === "medium"
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-white/10 bg-white/[0.02]"
          )}
        >
          <div
            className={cn(
              "p-1.5 rounded-lg shrink-0",
              alert.severity === "high"
                ? "bg-red-500/10 text-red-400"
                : alert.severity === "medium"
                ? "bg-amber-500/10 text-amber-400"
                : "bg-white/5 text-neutral-400"
            )}
          >
            {alert.change_percent !== null && alert.change_percent < 0 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : alert.change_percent !== null ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                  alert.severity === "high"
                    ? "bg-red-500/20 text-red-400"
                    : alert.severity === "medium"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/10 text-neutral-400"
                )}
              >
                {alert.severity}
              </span>
              <Sparkles className="w-2.5 h-2.5 text-[#00D26A]" />
              <span className="text-[8px] text-neutral-600">
                {new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-xs font-bold text-white">{alert.title}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{alert.description}</p>
            {alert.action && (
              <p className="text-[10px] text-[#00D26A] mt-1 font-bold">{alert.action}</p>
            )}
          </div>
          <button
            onClick={() => { markAsRead(alert.id); dismiss(alert.id); }}
            className="text-neutral-600 hover:text-white transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
