"use client";

import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLinks } from "@/hooks/use-links";
import { useTeam } from "@/hooks/use-team";
import { useClickStats } from "@/hooks/use-click-stats";
import { ClickChart } from "@/components/dashboard/click-chart";
import { QuickCreate } from "@/components/dashboard/quick-create";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardLinks } from "@/components/dashboard/dashboard-links";
import { Link as LinkIcon, MousePointer2, Users, TrendingUp } from "lucide-react";
import { AnomalyAlert } from "@/components/dashboard/anomaly-alert";
import { GoalTracker } from "@/components/dashboard/goal-tracker";

export default function DashboardPage() {
  const { links, loading: linksLoading } = useLinks();
  const { teams } = useTeam();
  const { totalClicks, clicksToday, dailyCounts, recentClicks, loading: statsLoading } = useClickStats();

  const clickRate = links.length > 0
    ? `${Math.round((totalClicks / links.length) * 10) / 10}`
    : "0";

  const stats = [
    {
      title: "Links",
      value: linksLoading ? "..." : links.length.toString(),
      change: links.length > 0 ? `+${links.length}` : "",
      changeLabel: "total",
      icon: <LinkIcon className="w-5 h-5" />,
    },
    {
      title: "Clicks",
      value: statsLoading ? "..." : totalClicks.toString(),
      change: clicksToday > 0 ? `+${clicksToday}` : "+0",
      changeLabel: "today",
      icon: <MousePointer2 className="w-5 h-5" />,
    },
    {
      title: "Active Teams",
      value: teams.length.toString(),
      change: "",
      changeLabel: "",
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Click Rate",
      value: clickRate,
      change: "",
      changeLabel: "per link",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <>
      <Header title="Intelligence Hub" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="glass-card bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 group relative overflow-hidden"
            >
              {/* Card Accent */}
              <div className="absolute top-0 left-0 w-1 h-full bg-[#00D26A]/20 group-hover:bg-[#00D26A] transition-all duration-500" />

              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-xl bg-[#00D26A]/10 text-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.1)] group-hover:scale-110 transition-transform duration-500">
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="text-4xl font-black tracking-tight text-white mb-1">
                  {stat.value}
                </div>
                {stat.change ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#39FF14] bg-[#39FF14]/10 px-2 py-0.5 rounded-full">
                      {stat.change}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                      {stat.changeLabel}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">
                    {stat.changeLabel || "Live Status"}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Click Goal Alerts */}
        <GoalTracker />

        {/* AI Anomaly Alerts */}
        <AnomalyAlert />

        {/* Quick Create Link */}
        <QuickCreate />

        {/* Your Links (compact list) */}
        <DashboardLinks links={links} loading={linksLoading} />

        {/* Chart + Recent Activity side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ClickChart dailyCounts={dailyCounts} loading={statsLoading} />
          </div>
          <div className="lg:col-span-1">
            <RecentActivity recentClicks={recentClicks} loading={statsLoading} />
          </div>
        </div>
      </div>
    </>
  );
}
