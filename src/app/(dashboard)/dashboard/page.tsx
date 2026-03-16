"use client";

import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLinks } from "@/hooks/use-links";
import { useTeam } from "@/hooks/use-team";
import { useEffect, useState } from "react";
import { Link as LinkIcon, MousePointer2, Users, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { links, loading: linksLoading } = useLinks();
  const { teams } = useTeam();
  
  const stats = [
    {
      title: "Total Links",
      value: linksLoading ? "..." : links.length.toString(),
      change: links.length > 0 ? `+${links.length}` : "0",
      icon: <LinkIcon className="w-5 h-5" />,
    },
    {
      title: "Total Clicks",
      value: "0",
      change: "+0%",
      icon: <MousePointer2 className="w-5 h-5" />,
    },
    {
      title: "Active Teams",
      value: teams.length.toString(),
      change: "",
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Click Rate",
      value: "0%",
      change: "",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <>
      <Header title="Intelligence Hub" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
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
                <div className="text-4xl font-black tracking-tight text-white mb-1">{stat.value}</div>
                {stat.change && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#39FF14] bg-[#39FF14]/10 px-2 py-0.5 rounded-full">
                      {stat.change}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                      Growth
                    </span>
                  </div>
                )}
                {!stat.change && (
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">
                    Live Status
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00D26A]" />
              Advanced Intelligence
            </CardTitle>
            <p className="text-sm text-neutral-500 font-medium">Real-time link performance and anomalies</p>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
              <div className="w-20 h-20 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,210,106,0.05)] border border-[#00D26A]/10">
                <LinkIcon className="w-10 h-10 text-[#00D26A]/40" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">System Ready</h3>
              <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                Connect your first high-performance link to activate <br />
                the AI Monitoring Engine.
              </p>
              <Link href="/dashboard/links">
                <Button className="mt-8 btn-secondary-glass rounded-xl px-8 font-black uppercase text-xs tracking-widest h-11">
                  Generate Secure Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
