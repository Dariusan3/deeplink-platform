"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Copy, Check, Settings2, ChevronUp, FolderOpen, Target, Sparkles, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLinks } from "@/hooks/use-links";
import { useTeam } from "@/hooks/use-team";
import { useCollections } from "@/hooks/use-collections";
import { useSettings } from "@/hooks/use-settings";
import { normalizeDestinationUrl, buildShortUrl, getDisplayHost, sanitizePath } from "@/lib/url-normalize";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuickCreate() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced fields
  const [customSlug, setCustomSlug] = useState("");
  const [title, setTitle] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [clickGoal, setClickGoal] = useState("");
  const [clickGoalPeriod, setClickGoalPeriod] = useState("daily");

  const { createLink } = useLinks();
  const { activeTeam } = useTeam();
  const { collections } = useCollections();
  const { settings } = useSettings();

  // Pre-fill the URL field with the team's default_domain on first mount.
  // We don't overwrite if the user has already typed something.
  useEffect(() => {
    if (!url && settings?.default_domain) setUrl(settings.default_domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.default_domain]);

  const isValidUrl = (u: string) => /^https?:\/\/.+\..+/.test(u.trim());

  const isOwnDomain = (u: string) => {
    if (typeof window === "undefined") return false;
    try {
      return new URL(u.trim()).hostname === window.location.hostname;
    } catch {
      return false;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please paste a URL first");
      return;
    }
    if (!isValidUrl(url)) {
      toast.error("Please enter a valid URL (e.g. https://example.com)");
      return;
    }
    if (isOwnDomain(url)) {
      toast.error("You can't shorten a link that already points to this platform.");
      return;
    }

    setLoading(true);
    try {
      let linkTitle = title.trim() || "New Link";
      if (linkTitle === "New Link") {
        try { linkTitle = new URL(url).hostname.replace("www.", ""); } catch {}
      }

      const slug = customSlug.trim() || Math.random().toString(36).substring(2, 8);
      await createLink({
        title: linkTitle,
        destination_url: normalizeDestinationUrl(url),
        slug,
        is_active: true,
        collection_id: collectionId || undefined,
        click_goal: clickGoal ? Number(clickGoal) : undefined,
        click_goal_period: clickGoal ? clickGoalPeriod : undefined,
      });

      const showConfirm = settings?.show_link_creation_confirmation !== false;

      if (showConfirm) {
        // Show the success card with copy/QR for ~5s.
        setCreatedSlug(slug);
        toast.success("Link created!");
        setTimeout(() => {
          setCreatedSlug(null);
          setUrl("");
          setCustomSlug("");
          setTitle("");
          setCollectionId(null);
          setClickGoal("");
          setShowAdvanced(false);
        }, 5000);
      } else {
        // Setting OFF — skip the in-card confirmation, reset instantly.
        toast.success("Link created");
        setUrl("");
        setCustomSlug("");
        setTitle("");
        setCollectionId(null);
        setClickGoal("");
        setShowAdvanced(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const copyShortUrl = () => {
    if (!createdSlug) return;
    const shortUrl = buildShortUrl(createdSlug);
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shortUrl = createdSlug
    ? `${typeof window !== "undefined" ? getDisplayHost() : ""}/${createdSlug}`
    : "";

  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
      <CardHeader className="pt-8 px-8 pb-4">
        <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-[#00D26A]" />
          Create App Link
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {createdSlug ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00D26A]/5 border border-[#00D26A]/20">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#00D26A] mb-1">
                Link Created
              </p>
              <p className="text-sm font-bold text-white truncate">{shortUrl}</p>
            </div>
            <Button
              onClick={copyShortUrl}
              className="shrink-0 h-10 px-4 rounded-xl bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-[10px] tracking-widest gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Paste your URLs here"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-12 pr-10 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.readText().then((text) => {
                    setUrl(text);
                    toast.success("Pasted from clipboard");
                  });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#00D26A] transition-colors"
                title="Paste from clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "shrink-0 h-12 w-12 rounded-xl border transition-all",
                showAdvanced
                  ? "bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]"
                  : "bg-white/[0.03] border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.06]"
              )}
              onClick={() => setShowAdvanced(!showAdvanced)}
              title="Advanced options"
            >
              {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
            </Button>
            <Button
              type="submit"
              disabled={loading || !activeTeam}
              className="shrink-0 h-12 px-6 rounded-xl btn-primary-pulse font-black uppercase text-xs tracking-widest"
            >
              {loading ? "Creating..." : "Create Link"}
            </Button>
          </form>
        )}

        {/* Advanced Options Panel */}
        {!createdSlug && showAdvanced && (
          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
                <StickyNote className="w-2.5 h-2.5 text-[#00D26A]" /> Title
              </Label>
              <Input
                placeholder="My Link"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 bg-white/[0.03] border-white/10 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#00D26A]" /> Custom Path
              </Label>
              <Input
                placeholder="my-promo (any path)"
                value={customSlug}
                onChange={(e) => setCustomSlug(sanitizePath(e.target.value))}
                className="h-9 bg-white/[0.03] border-white/10 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
                <FolderOpen className="w-2.5 h-2.5 text-[#00D26A]" /> Collection
              </Label>
              <select
                value={collectionId || ""}
                onChange={(e) => setCollectionId(e.target.value || null)}
                className="w-full h-9 px-2 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
              >
                <option value="" className="bg-neutral-900">None</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id} className="bg-neutral-900">{col.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
                <Target className="w-2.5 h-2.5 text-[#00D26A]" /> Click Goal
              </Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min={0}
                  placeholder="100"
                  value={clickGoal}
                  onChange={(e) => setClickGoal(e.target.value)}
                  className="h-9 bg-white/[0.03] border-white/10 rounded-lg text-xs w-16"
                />
                <select
                  value={clickGoalPeriod}
                  onChange={(e) => setClickGoalPeriod(e.target.value)}
                  className="h-9 px-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-white text-[10px] outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
                >
                  <option value="daily" className="bg-neutral-900">/day</option>
                  <option value="weekly" className="bg-neutral-900">/week</option>
                  <option value="monthly" className="bg-neutral-900">/mo</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
