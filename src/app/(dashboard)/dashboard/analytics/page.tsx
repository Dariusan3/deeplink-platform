"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <Header title="Deep Analytics" />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Traffic Sources", desc: "Originating domain analysis" },
          { title: "Device Distribution", desc: "Hardware vs OS breakdown" },
          { title: "Geographic Reach", desc: "Global presence mapping" },
        ].map((item, i) => (
          <Card key={i} className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00D26A]/10 group-hover:bg-[#00D26A] transition-all duration-500" />
            <CardHeader className="pt-6 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{item.title}</CardTitle>
              <CardDescription className="text-sm font-medium text-neutral-400">{item.desc}</CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center text-neutral-600 font-black text-xs uppercase tracking-widest border-t border-white/5 mt-4 bg-white/[0.01]">
              Neural Engine Syncing...
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
        <CardHeader className="pt-8 px-8">
          <CardTitle className="text-xl font-black tracking-tight text-white">Live Performance Stream</CardTitle>
          <CardDescription className="text-sm font-medium text-neutral-500">Comprehensive real-time link breakdown</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10 pt-4">
          <div className="rounded-2xl border border-dashed border-white/5 bg-white/[0.01] p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#00D26A]/5 flex items-center justify-center mb-4 text-[#00D26A]/30">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest leading-loose">
              Awaiting data signals. <br />
              Deploy a link to begin telemetry collection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
