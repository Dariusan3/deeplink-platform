"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/use-settings";
import { useUser } from "@/hooks/use-user";
import { useTeam } from "@/hooks/use-team";
import { hasFeature } from "@/lib/entitlements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Link2, Monitor, Save, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Bucharest",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

type SettingsTab = "link-settings" | "display";

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "link-settings",
    label: "Link Settings",
    icon: <Link2 className="w-4 h-4" />,
  },
  {
    id: "display",
    label: "Display Settings",
    icon: <Monitor className="w-4 h-4" />,
  },
];

function Toggle({
  checked,
  onChange,
  premium,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  premium?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {premium && (
        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
          Premium
        </span>
      )}
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative w-12 h-6 rounded-full transition-all duration-300",
          disabled
            ? "opacity-40 cursor-not-allowed"
            : "cursor-pointer",
          checked
            ? "bg-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.3)]"
            : "bg-white/5 border border-white/10"
        )}
      >
        <div
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm",
            checked ? "left-7 bg-white" : "left-1 bg-neutral-500"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const { user, profile, refreshProfile } = useUser();
  const { activeTeam } = useTeam();
  const canRemoveBranding = hasFeature(activeTeam?.plan, "removeBranding");
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState<SettingsTab>("link-settings");
  const [saving, setSaving] = useState(false);

  // Account deletion (GDPR right to erasure)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Local form state
  const [fullName, setFullName] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [removeBranding, setRemoveBranding] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [defaultDomain, setDefaultDomain] = useState("");

  // Sync settings to local state
  useEffect(() => {
    if (settings) {
      setShowConfirmation(settings.show_link_creation_confirmation);
      setRemoveBranding(settings.show_branding === false);
      setTimezone(settings.timezone);
      setDefaultDomain(settings.default_domain);
    }
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      await refreshProfile();
      toast.success("Profile updated");
    }
    setSaving(false);
  };

  const handleSaveDisplaySettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        show_link_creation_confirmation: showConfirmation,
        // show_branding=false means "Powered by Tappr" is hidden. Only send a
        // hide when the plan allows it; the DB trigger rejects it otherwise.
        show_branding: canRemoveBranding ? !removeBranding : true,
        timezone,
      });
    } catch {}
    setSaving(false);
  };

  const handleSaveLinkSettings = async () => {
    setSaving(true);
    try {
      // Domain is fixed to tappr.me — the UI input is read-only. We still
      // persist it so older accounts get normalised on next save.
      await updateSettings({ default_domain: "tappr.me" });
    } catch {}
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account");
      }
      // Account and all data are gone — bounce to a clean signed-out state.
      toast.success("Your account and data have been deleted.");
      window.location.href = "/login";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  };


  return (
    <>
      <Header title="Settings" />
      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto">
          {/* Sidebar Navigation */}
          <div className="lg:w-56 shrink-0">
            {/* Profile Card */}
            <Card className="glass-card bg-white/[0.01] border-white/5 mb-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Name
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 bg-white/[0.02] border-white/10 rounded-xl focus:border-[#00D26A] focus:ring-[#00D26A]/20 text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Email
                  </Label>
                  <Input
                    value={profile?.email || user?.email || ""}
                    disabled
                    className="h-10 bg-white/[0.01] border-white/5 text-neutral-500 rounded-xl text-sm font-medium cursor-not-allowed"
                  />
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full h-9 rounded-xl btn-primary-pulse text-black font-bold text-xs"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Settings Tabs */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 px-3 mb-2">
                Settings
              </p>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                    activeTab === tab.id
                      ? "bg-[#00D26A]/10 text-[#00D26A] shadow-[inset_0_0_12px_rgba(0,210,106,0.05)]"
                      : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Display Settings Tab */}
                {activeTab === "display" && (
                  <>
                    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                      <CardHeader className="pt-8 px-8">
                        <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                          <Monitor className="w-5 h-5 text-[#00D26A]" />
                          Display Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-8 pb-8 space-y-6">
                        <div className="flex items-center justify-between group p-4 rounded-xl bg-white/[0.01] border border-white/5">
                          <div className="space-y-1">
                            <p className="font-bold text-white text-sm">
                              Show Link Creation Confirmation
                            </p>
                            <p className="text-xs text-neutral-500 font-medium">
                              After creating a link, briefly show a confirmation with the new
                              short link and a copy button
                            </p>
                          </div>
                          <Toggle checked={showConfirmation} onChange={setShowConfirmation} />
                        </div>

                        <div className="flex items-center justify-between group p-4 rounded-xl bg-white/[0.01] border border-white/5">
                          <div className="space-y-1">
                            <p className="font-bold text-white text-sm">
                              Remove Tappr Branding
                            </p>
                            <p className="text-xs text-neutral-500 font-medium">
                              Hide the &quot;Powered by Tappr&quot; badge on interstitial pages.
                              {!canRemoveBranding && " Available on Growth and above."}
                            </p>
                          </div>
                          <Toggle
                            checked={canRemoveBranding && removeBranding}
                            onChange={setRemoveBranding}
                            premium={!canRemoveBranding}
                            disabled={!canRemoveBranding}
                          />
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3">
                          <div className="space-y-1">
                            <p className="font-bold text-white text-sm">
                              Timezone for Click Analytics
                            </p>
                            <p className="text-xs text-neutral-500 font-medium">
                              Timezone used for displaying click analytics and statistics
                            </p>
                          </div>
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/10 text-white text-sm font-medium focus:border-[#00D26A] focus:ring-1 focus:ring-[#00D26A]/20 outline-none transition-all appearance-none cursor-pointer"
                          >
                            {TIMEZONES.map((tz) => (
                              <option key={tz} value={tz} className="bg-neutral-900 text-white">
                                {tz.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSaveDisplaySettings}
                            disabled={saving}
                            className="h-10 px-6 rounded-xl btn-primary-pulse text-black font-bold text-xs gap-2"
                          >
                            {saving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            Save Settings
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Link Settings Tab */}
                {activeTab === "link-settings" && (
                  <>
                    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                      <CardHeader className="pt-8 px-8">
                        <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                          <Link2 className="w-5 h-5 text-[#00D26A]" />
                          Link Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-8 pb-8 space-y-6">
                        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3">
                          <div className="space-y-1">
                            <p className="font-bold text-white text-sm">Default Domain</p>
                            <p className="text-xs text-neutral-500 font-medium">
                              All Tappr short links are served from <span className="text-white font-bold">tappr.me</span>. Custom domains aren&apos;t available yet.
                            </p>
                          </div>
                          <div className="h-11 px-4 flex items-center justify-between bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white select-none">
                            <span>tappr.me</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Fixed</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                  </>
                )}

                {/* Danger Zone — account deletion (GDPR right to erasure).
                    Always visible, regardless of the active tab. */}
                <Card className="glass-card bg-red-500/[0.02] border-red-500/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                  <CardHeader className="pt-8 px-8">
                    <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription className="text-neutral-500">
                      Permanently delete your account and all associated data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10">
                      <div className="space-y-1">
                        <p className="font-bold text-white text-sm">Delete account</p>
                        <p className="text-xs text-neutral-500 font-medium max-w-md">
                          This removes your profile, links, click analytics, AI history
                          and connected integrations. This cannot be undone.
                        </p>
                      </div>
                      <Button
                        onClick={() => { setDeleteConfirm(""); setShowDeleteDialog(true); }}
                        className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs gap-2 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete-account confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !deleting && setShowDeleteDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Delete your account?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes your account, links, click analytics, AI Brain
              history and any connected integrations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Type <span className="text-red-400">DELETE</span> to confirm
            </Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoFocus
              disabled={deleting}
              className="h-10 bg-white/[0.02] border-white/10 rounded-xl focus:border-red-500 focus:ring-red-500/20 text-sm font-medium"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "DELETE" || deleting}
              className="bg-red-500 hover:bg-red-600 text-white font-black disabled:opacity-40"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
