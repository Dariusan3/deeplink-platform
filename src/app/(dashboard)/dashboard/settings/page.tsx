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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Settings2, Link2, Monitor, Save, Loader2, Unplug, ExternalLink, Plug } from "lucide-react";
import { useInstagram } from "@/hooks/use-instagram";
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

type SettingsTab = "link-settings" | "display" | "redirect" | "integrations";

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
  {
    id: "redirect",
    label: "Link Redirect Page",
    icon: <Settings2 className="w-4 h-4" />,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: <Plug className="w-4 h-4" />,
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
  const supabase = useMemo(() => createClient(), []);
  const { integration: igIntegration, isConnected: igConnected, disconnect: igDisconnect, loading: igLoading } = useInstagram();
  const [activeTab, setActiveTab] = useState<SettingsTab>("link-settings");
  const [saving, setSaving] = useState(false);

  // Local form state
  const [fullName, setFullName] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [timezone, setTimezone] = useState("UTC");
  const [defaultDomain, setDefaultDomain] = useState("");
  const [showAppTap, setShowAppTap] = useState(true);
  const [showBranding, setShowBranding] = useState(true);

  // Sync settings to local state
  useEffect(() => {
    if (settings) {
      setShowConfirmation(settings.show_link_creation_confirmation);
      setTimezone(settings.timezone);
      setDefaultDomain(settings.default_domain);
      setShowAppTap(settings.show_app_tap_to_continue);
      setShowBranding(settings.show_branding);
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
        timezone,
      });
    } catch {}
    setSaving(false);
  };

  const handleSaveLinkSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({ default_domain: defaultDomain });
    } catch {}
    setSaving(false);
  };

  const handleSaveRedirectSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        show_app_tap_to_continue: showAppTap,
        show_branding: showBranding,
      });
    } catch {}
    setSaving(false);
  };

  const handlePurgeData = async () => {
    toast.error("This action is not yet implemented.");
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
                              Show a confirmation popup with QR code and quick actions after
                              creating a link
                            </p>
                          </div>
                          <Toggle checked={showConfirmation} onChange={setShowConfirmation} />
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
                              This domain will be pre-selected when creating new links
                            </p>
                          </div>
                          <Input
                            value={defaultDomain}
                            onChange={(e) => setDefaultDomain(e.target.value)}
                            placeholder="https://yourdomain.com"
                            className="h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-[#00D26A] focus:ring-[#00D26A]/20 text-sm font-medium"
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSaveLinkSettings}
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

                    {/* Danger Zone */}
                    <Card className="bg-red-500/[0.02] border-red-500/20 rounded-2xl overflow-hidden">
                      <CardHeader className="pt-8 px-8">
                        <CardTitle className="text-xl font-black tracking-tight text-red-500 uppercase tracking-[0.05em]">
                          Danger Zone
                        </CardTitle>
                        <CardDescription className="text-sm font-medium text-neutral-400">
                          Irreversible actions — proceed with caution
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-8 pb-8">
                        <Button
                          variant="destructive"
                          onClick={handlePurgeData}
                          className="h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/30"
                        >
                          Purge All Data
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Link Redirect Page Tab */}
                {activeTab === "redirect" && (
                  <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                    <CardHeader className="pt-8 px-8">
                      <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-[#00D26A]" />
                        Link Redirect Page
                      </CardTitle>
                      <CardDescription className="text-sm font-medium text-neutral-500">
                        The page that is briefly shown when someone clicks your links on mobile
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 space-y-6">
                      <div className="flex items-center justify-between group p-4 rounded-xl bg-white/[0.01] border border-white/5">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">
                            Show App & Tap to Continue
                          </p>
                          <p className="text-xs text-neutral-500 font-medium">
                            Display &quot;Opening in [app]...&quot; and &quot;Tap to Continue&quot;
                            on the redirect page
                          </p>
                        </div>
                        <Toggle checked={showAppTap} onChange={setShowAppTap} />
                      </div>

                      <div className="flex items-center justify-between group p-4 rounded-xl bg-white/[0.01] border border-white/5">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">Show Tappr Branding</p>
                          <p className="text-xs text-neutral-500 font-medium">
                            Display &quot;Powered by Tappr&quot; on the redirect page
                          </p>
                        </div>
                        <Toggle checked={true} onChange={() => toast.error("Upgrade to Premium to disable branding")} premium disabled />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveRedirectSettings}
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
                )}

                {/* Integrations Tab */}
                {activeTab === "integrations" && (
                  <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                    <CardHeader className="pt-8 px-8">
                      <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                        <Plug className="w-5 h-5 text-[#00D26A]" />
                        Integrations
                      </CardTitle>
                      <CardDescription className="text-sm font-medium text-neutral-500">
                        Connect external platforms to track your full marketing funnel
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 space-y-6">
                      {/* Instagram Integration */}
                      <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-amber-500/20 border border-purple-500/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Instagram</p>
                              <p className="text-[10px] text-neutral-500 font-medium">
                                Track profile views &amp; funnel performance
                              </p>
                            </div>
                          </div>

                          {igLoading ? (
                            <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                          ) : igConnected ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-[#00D26A] bg-[#00D26A]/10 px-2 py-1 rounded-full border border-[#00D26A]/20">
                                @{igIntegration?.ig_username}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={igDisconnect}
                                className="h-8 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-500/10"
                              >
                                <Unplug className="w-3 h-3 mr-1" />
                                Disconnect
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => {
                                const clientId = process.env.NEXT_PUBLIC_IG_APP_ID;
                                if (!clientId) {
                                  toast.error("Instagram App ID not configured. Set NEXT_PUBLIC_IG_APP_ID in your environment.");
                                  return;
                                }
                                const redirectUri = `${window.location.origin}/api/ig/callback`;
                                const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_business_basic,instagram_business_manage_insights&response_type=code&enable_fb_login=0`;
                                window.location.href = authUrl;
                              }}
                              className="h-9 px-5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-opacity"
                            >
                              <ExternalLink className="w-3 h-3 mr-2" />
                              Connect Instagram
                            </Button>
                          )}
                        </div>

                        {igConnected && (
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-[10px] text-neutral-500 font-medium">
                              Instagram profile views will appear on your dashboard funnel.
                              Data syncs automatically via the Instagram Graph API.
                            </p>
                          </div>
                        )}

                        {!igConnected && !igLoading && (
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                              Connect your Instagram Business or Creator account to see profile views
                              alongside your link clicks — track your full funnel from IG profile visit to link click.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Placeholder for future integrations */}
                      <div className="p-5 rounded-xl border border-dashed border-white/10 text-center">
                        <p className="text-xs text-neutral-600 font-bold">
                          More integrations coming soon — TikTok, YouTube, X (Twitter)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
