"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Check, ChevronRight, ShieldAlert, X } from "lucide-react";
import { useAnomalyAlerts } from "@/hooks/use-anomaly-alerts";
import { ALERT_ICONS } from "@/lib/alert-icons";
import type { AlertType } from "@/lib/alerts";
import { cn } from "@/lib/utils";

// Notification bell mounted in the dashboard header. Shows a badge with
// the unread count and opens a popover with the most recent open alerts.
// Replaces the old in-page <RealtimeAlerts /> block so the dashboard
// stays compact — users see the count globally and dive in only when
// something deserves attention.

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function NotificationBell() {
  const { alerts, unreadCount, markAsRead, markAllAsRead, dismiss } = useAnomalyAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Show the 8 most recent open alerts in the popover; everything else
  // lives on /dashboard/alerts.
  const visibleAlerts = alerts.slice(0, 8);
  const hasUnread = unreadCount > 0;

  // Click-outside closes the popover. Escape too — small but expected.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          // Mark visible ones as read as soon as the user opens the
          // popover — same UX as Slack / Linear.
          if (!open && hasUnread) {
            markAllAsRead();
          }
        }}
        className={cn(
          "relative h-9 w-9 rounded-xl flex items-center justify-center border transition-all",
          hasUnread
            ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15"
            : "border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/5"
        )}
        title={hasUnread ? `${unreadCount} unread alert${unreadCount !== 1 ? "s" : ""}` : "Notifications"}
        aria-label="Notifications"
      >
        {hasUnread ? <BellRing className="w-4 h-4 animate-pulse" /> : <Bell className="w-4 h-4" />}
        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.4)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[380px] max-h-[80vh] glass-card bg-black/95 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">Notifications</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-0.5">
                {alerts.length === 0
                  ? "All clear"
                  : `${alerts.length} open${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {visibleAlerts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-[#00D26A]" />
                </div>
                <p className="text-sm font-bold text-white">All clear</p>
                <p className="text-xs text-neutral-500 mt-1">
                  No alerts need your attention right now.
                </p>
              </div>
            ) : (
              <ul>
                {visibleAlerts.map((a) => {
                  const Icon =
                    (a.alert_type && ALERT_ICONS[a.alert_type as AlertType]) || ShieldAlert;
                  return (
                  <li
                    key={a.id}
                    className={cn(
                      "px-4 py-3 border-b border-white/5 last:border-0 transition-colors",
                      !a.is_read && "bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5",
                          a.severity === "high"
                            ? "bg-red-500/10 text-red-400"
                            : a.severity === "medium"
                              ? "bg-amber-400/10 text-amber-400"
                              : "bg-blue-400/10 text-blue-400"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-snug">{a.title}</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed line-clamp-2">
                          {a.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-neutral-600">
                            {relativeTime(a.created_at)} ago
                          </span>
                          {!a.is_read && (
                            <button
                              onClick={() => markAsRead(a.id)}
                              className="text-[10px] font-black uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14]"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => dismiss(a.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-red-400 ml-auto"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
            <Link
              href="/dashboard/alerts"
              onClick={() => setOpen(false)}
              className="text-[10px] font-black uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] inline-flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
            {alerts.length > visibleAlerts.length && (
              <span className="text-[10px] font-bold text-neutral-600">
                +{alerts.length - visibleAlerts.length} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
