"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Tablet, Monitor, Activity, Globe } from "lucide-react";
import { RecentClick } from "@/hooks/use-click-stats";

interface RecentActivityProps {
  recentClicks: RecentClick[];
  loading?: boolean;
}

function countryToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...([...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
  );
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType) {
    case "mobile":
      return <Smartphone className="w-3.5 h-3.5" />;
    case "tablet":
      return <Tablet className="w-3.5 h-3.5" />;
    case "desktop":
      return <Monitor className="w-3.5 h-3.5" />;
    default:
      return <Globe className="w-3.5 h-3.5" />;
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractDomain(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.replace("www.", "");
  } catch {
    return referer;
  }
}

export function RecentActivity({ recentClicks, loading }: RecentActivityProps) {
  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
      <CardHeader className="pt-8 px-8 pb-4">
        <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#00D26A]" />
          Recent Click Activity
        </CardTitle>
        <p className="text-sm text-neutral-500 font-medium">
          Click activity will appear here as your links receive traffic.
        </p>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : recentClicks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center mb-4 border border-white/5">
              <Activity className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-sm font-bold text-neutral-500">No recent activity</p>
            <p className="text-xs text-neutral-600 mt-1">
              Click activity will appear here as your links receive traffic.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentClicks.map((click) => {
              const flag = countryToFlag(click.country);
              const domain = extractDomain(click.referer);

              return (
                <div
                  key={click.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Device icon */}
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-neutral-400 group-hover:text-[#00D26A] transition-colors shrink-0">
                    {getDeviceIcon(click.device_type)}
                  </div>

                  {/* Country flag */}
                  <span className="text-base shrink-0" title={click.country || "Unknown"}>
                    {flag || "🌐"}
                  </span>

                  {/* Link info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white">
                      /{click.link_slug}
                    </span>
                    {click.link_title && (
                      <span className="text-xs text-neutral-500 ml-2">
                        {click.link_title}
                      </span>
                    )}
                  </div>

                  {/* Referrer */}
                  {domain && (
                    <span className="text-[10px] font-bold text-neutral-600 truncate max-w-[100px] hidden sm:block">
                      {domain}
                    </span>
                  )}

                  {/* Time */}
                  <span className="text-[10px] font-bold text-neutral-500 shrink-0">
                    {relativeTime(click.clicked_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
