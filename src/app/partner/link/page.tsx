"use client";

import { useState, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { usePartner } from "@/hooks/use-partner";
import { usePartnerStats } from "@/hooks/use-partner-stats";
import { Copy, Check, Download, Globe, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";

export default function PartnerLinkPage() {
  const { referralUrl, profile } = usePartner();
  const { stats, loading } = usePartnerStats();
  const [copied, setCopied] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }, []);

  const clicksToday = stats?.clicksByDay.find((d) => d.date === today)?.count ?? 0;
  const clicksThisWeek = stats?.clicksByDay
    .filter((d) => d.date >= weekStart)
    .reduce((s, d) => s + d.count, 0) ?? 0;

  const copyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#partner-qr canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `tappr-partner-${profile?.referral_code || "qr"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const maxBar = Math.max(1, ...(stats?.clicksByDay.map((d) => d.count) ?? [1]));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-20">
      <PageHeader
        accent="purple"
        eyebrow="Partner Dashboard" title="My Link" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card border-white/5 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black">Referral URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-sm text-[#A855F7] truncate">
                {referralUrl}
              </div>
              <Button onClick={copyLink} className={copied ? "bg-[#A855F7] text-black h-11 px-4" : "bg-white/5 hover:bg-white/10 text-white h-11 px-4"}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Total Clicks (14d)</p>
                <p className="text-2xl font-black text-white mt-1">{stats?.totalClicks ?? 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Today</p>
                <p className="text-2xl font-black text-white mt-1">{clicksToday}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">This Week</p>
                <p className="text-2xl font-black text-white mt-1">{clicksThisWeek}</p>
              </div>
            </div>

            {/* 14d sparkline */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Clicks · Last 14 days</p>
              <div className="flex items-end gap-1 h-24">
                {(stats?.clicksByDay ?? []).map((d) => (
                  <div key={d.date} className="flex-1 bg-[#A855F7]/20 hover:bg-[#A855F7]/40 rounded-sm transition-all relative group" style={{ height: `${(d.count / maxBar) * 100}%` }}>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-black px-1.5 py-0.5 rounded whitespace-nowrap">
                      {d.count} · {d.date.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black">QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="partner-qr" className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-xl">
                {referralUrl ? (
                  <QRCodeCanvas value={referralUrl} size={180} bgColor="#fff" fgColor="#000" />
                ) : (
                  <div className="w-[180px] h-[180px]" />
                )}
              </div>
              <Button onClick={downloadQr} variant="outline" className="w-full h-9 rounded-lg border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#A855F7]/10 hover:text-[#A855F7] gap-2">
                <Download className="w-3.5 h-3.5" /> Download PNG
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geo + device */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2"><Globe className="w-4 h-4 text-[#A855F7]" /> Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.countries ?? []).length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">{loading ? "Loading..." : "No clicks yet"}</p>
            ) : (
              <div className="space-y-2">
                {(stats?.countries ?? []).slice(0, 5).map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs font-bold text-white">{c.country || "—"}</span>
                    <span className="text-xs text-neutral-400">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black">Device Split</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.devices ?? []).length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">{loading ? "Loading..." : "No clicks yet"}</p>
            ) : (
              <div className="space-y-2">
                {(stats?.devices ?? []).map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      {d.device === "mobile" ? <Smartphone className="w-3.5 h-3.5 text-neutral-400" /> : <Monitor className="w-3.5 h-3.5 text-neutral-400" />}
                      <span className="text-xs font-bold text-white capitalize">{d.device}</span>
                    </div>
                    <span className="text-xs text-neutral-400">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
