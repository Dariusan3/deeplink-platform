"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 max-w-4xl mx-auto w-full">
      <Header title="System Configuration" />
      
      <div className="space-y-10">
        {/* Profile Section */}
        <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-xl font-black tracking-tight text-white uppercase tracking-[0.05em]">Identity Control</CardTitle>
            <CardDescription className="text-sm font-medium text-neutral-500">Global account parameters and credentials</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Legal Name</Label>
                <Input id="name" placeholder="John Doe" className="h-12 bg-white/[0.02] border-white/10 rounded-xl focus:border-[#00D26A] focus:ring-[#00D26A]/20 transition-all font-medium" />
              </div>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Routing Address</Label>
                <Input id="email" type="email" placeholder="john@example.com" disabled className="h-12 bg-white/[0.01] border-white/5 text-neutral-500 rounded-xl font-medium cursor-not-allowed" />
              </div>
            </div>
            <Button className="btn-primary-pulse h-12 px-10 rounded-xl text-black font-black uppercase tracking-widest text-xs">
              Commit Changes
            </Button>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-xl font-black tracking-tight text-white uppercase tracking-[0.05em]">Logic Engine</CardTitle>
            <CardDescription className="text-sm font-medium text-neutral-500">Neural redirection behavior and alerts</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="font-black text-white tracking-tight">Direct Pathing</p>
                <p className="text-xs text-neutral-500 font-medium">Bypass transition layers for all active links</p>
              </div>
              <div className="w-12 h-6 bg-[#00D26A] rounded-full relative p-1 cursor-pointer shadow-[0_0_15px_rgba(0,210,106,0.2)]">
                <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm" />
              </div>
            </div>
            <Separator className="bg-white/5" />
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="font-black text-white tracking-tight">Intelligence Feeds</p>
                <p className="text-xs text-neutral-500 font-medium">Automatic performance telemetry and anomaly reports</p>
              </div>
              <div className="w-12 h-6 bg-white/5 rounded-full relative p-1 cursor-pointer border border-white/10">
                 <div className="w-4 h-4 bg-neutral-600 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-red-500/[0.02] border-red-500/20 rounded-2xl overflow-hidden">
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-xl font-black tracking-tight text-red-500 uppercase tracking-[0.05em]">Destructive Termination</CardTitle>
            <CardDescription className="text-sm font-medium text-red-900/40">Irreversible operational shutdown</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Button variant="destructive" className="h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/30">
              Purge All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
