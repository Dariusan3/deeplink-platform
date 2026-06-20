"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { RulesDialog } from "@/components/links/rules-dialog";
import { QrDialog } from "@/components/qr/qr-dialog";
import { LinkAnalyticsDialog } from "@/components/links/link-analytics-dialog";
import { normalizeDestinationUrl, buildShortUrl, getDisplayHost, sanitizePath } from "@/lib/url-normalize";
import {
  ArrowLeft,
  Save,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Settings2,
  Trash2,
  BarChart3,
  Globe,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Link as LinkType } from "@/types/links";

export default function LinkEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const linkId = params.id;

  const { links, updateLink, deleteLink } = useLinks();
  const { collections } = useCollections();

  const link = useMemo<LinkType | undefined>(
    () => links.find((l) => l.id === linkId),
    [links, linkId]
  );

  // Draft state — saved only on Save button click.
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [clickGoal, setClickGoal] = useState<string>("");
  const [clickGoalPeriod, setClickGoalPeriod] = useState("daily");

  const [saving, setSaving] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync draft with the loaded link (and re-sync if it changes from elsewhere).
  useEffect(() => {
    if (!link) return;
    setTitle(link.title || "");
    setDestinationUrl(link.destination_url);
    setSlug(link.slug);
    setIsActive(!!link.is_active);
    setCollectionId(link.collection_id || null);
    setClickGoal(link.click_goal != null ? String(link.click_goal) : "");
    setClickGoalPeriod(link.click_goal_period || "daily");
  }, [link?.id, link?.title, link?.destination_url, link?.slug, link?.is_active, link?.collection_id, link?.click_goal, link?.click_goal_period]);

  if (!link) {
    return (
      <>
        <Header title="Edit Link" />
        <div className="p-6 max-w-3xl mx-auto">
          <button
            onClick={() => router.push("/dashboard/links")}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Links
          </button>
          <Card className="glass-card border-white/5">
            <CardContent className="p-12 text-center">
              <p className="text-sm text-neutral-500">
                Loading link, or it doesn&apos;t exist.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const shortUrl = typeof window !== "undefined"
    ? buildShortUrl(link.slug)
    : `tappr.me/${link.slug}`;

  const isValidUrl = (url: string) => /^https?:\/\/.+\..+/.test(url.trim());

  const isDirty =
    (title || "") !== (link.title || "") ||
    destinationUrl !== link.destination_url ||
    slug !== link.slug ||
    isActive !== !!link.is_active ||
    (collectionId || null) !== (link.collection_id || null) ||
    (clickGoal === "" ? null : Number(clickGoal)) !== (link.click_goal ?? null) ||
    (clickGoal === "" ? "daily" : clickGoalPeriod) !== (link.click_goal_period || "daily");

  const handleSave = async () => {
    if (!destinationUrl.trim() || !isValidUrl(destinationUrl)) {
      toast.error("Enter a valid destination URL (https://...)");
      return;
    }
    if (!slug.trim()) {
      toast.error("Custom path is required");
      return;
    }

    setSaving(true);
    try {
      const goalValue = clickGoal.trim() === "" ? null : Number(clickGoal);
      if (goalValue !== null && (Number.isNaN(goalValue) || goalValue < 0)) {
        toast.error("Click goal must be a positive number");
        return;
      }

      await updateLink(link.id, {
        title: title.trim() || null,
        destination_url: normalizeDestinationUrl(destinationUrl),
        slug: slug.trim(),
        is_active: isActive,
        collection_id: collectionId,
        click_goal: goalValue,
        click_goal_period: goalValue === null ? null : clickGoalPeriod,
      });
      toast.success("Link saved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save link";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Short URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await deleteLink(link.id);
    setShowDeleteConfirm(false);
    router.push("/dashboard/links");
  };

  return (
    <>
      <Header title="Edit Link" />
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => router.push("/dashboard/links")}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Links
          </button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={cn(
                "h-10 px-6 rounded-xl btn-primary-pulse text-black font-black uppercase text-xs tracking-widest gap-2",
                (saving || !isDirty) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: editable fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00D26A]" />
                  Link Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                    Title
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Internal name (not visible to visitors)"
                    className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                    Destination URL <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/page"
                    className={cn(
                      "bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11",
                      destinationUrl && !isValidUrl(destinationUrl) && "border-red-500/40 focus:border-red-500/60"
                    )}
                  />
                  {destinationUrl && !isValidUrl(destinationUrl) && (
                    <p className="text-[10px] font-bold text-red-400">
                      Must start with http:// or https://
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                    Custom Path
                  </Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(sanitizePath(e.target.value))}
                    placeholder="my-custom-path"
                    className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11 font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 font-bold">
                    Will be available at <span className="text-[#00D26A]">https://{getDisplayHost()}/{slug || "..."}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">Active</p>
                    <p className="text-[10px] text-neutral-500">When off, the short URL shows the paused page</p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    className="data-[state=checked]:bg-[#00D26A]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Collection & Goals */}
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#00D26A]" />
                  Collection & Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Collection
                  </Label>
                  <select
                    value={collectionId || ""}
                    onChange={(e) => setCollectionId(e.target.value || null)}
                    className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-medium outline-none focus:border-[#00D26A]/50 cursor-pointer [&>option]:bg-black"
                  >
                    <option value="">No collection</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Click Goal
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      value={clickGoal}
                      onChange={(e) => setClickGoal(e.target.value)}
                      placeholder="Target clicks"
                      className="bg-white/[0.03] border-white/10 rounded-xl h-11 w-36"
                    />
                    <span className="text-xs text-neutral-500 font-bold">per</span>
                    <select
                      value={clickGoalPeriod}
                      onChange={(e) => setClickGoalPeriod(e.target.value)}
                      disabled={clickGoal.trim() === ""}
                      className="h-11 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-medium outline-none focus:border-[#00D26A]/50 cursor-pointer disabled:opacity-50 [&>option]:bg-black"
                    >
                      <option value="daily">Day</option>
                      <option value="weekly">Week</option>
                      <option value="monthly">Month</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Routing rules — defer to existing dialog */}
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-[#00D26A]" />
                  Smart Routing Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {((link.redirect_rules as unknown[]) || []).length} active rule
                      {((link.redirect_rules as unknown[]) || []).length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      Route visitors based on country, device, time of day, or schedule
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowRules(true)}
                    variant="outline"
                    className="h-10 rounded-xl border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#39FF14] hover:border-[#00D26A]/20"
                  >
                    Edit Rules
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="glass-card border-red-500/10 bg-red-500/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black text-red-400">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-red-500/10">
                  <div>
                    <p className="text-sm font-bold text-white">Delete this link</p>
                    <p className="text-[10px] text-neutral-500">
                      Removes the link and all its analytics. Irreversible.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: read-only summary */}
          <div className="space-y-4">
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-neutral-500">Short URL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-sm text-[#00D26A] break-all">
                  {shortUrl}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="h-9 rounded-lg border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A] gap-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    onClick={() => setShowQr(true)}
                    variant="outline"
                    className="h-9 rounded-lg border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A] gap-1"
                  >
                    <QrCode className="w-3 h-3" /> QR
                  </Button>
                  <Button
                    onClick={() => window.open(link.destination_url, "_blank")}
                    variant="outline"
                    className="h-9 rounded-lg border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A] gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-neutral-500">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 font-bold">Total clicks</span>
                  <span className="text-sm font-black text-white">{(link.click_count ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 font-bold">Created</span>
                  <span className="text-xs font-bold text-white">
                    {new Date(link.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 font-bold">Updated</span>
                  <span className="text-xs font-bold text-white">
                    {new Date(link.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <Button
                  onClick={() => setShowAnalytics(true)}
                  variant="outline"
                  className="w-full mt-2 h-9 rounded-lg border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A] gap-2"
                >
                  <BarChart3 className="w-3 h-3" /> View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Embedded dialogs */}
      <LinkAnalyticsDialog linkId={link.id} open={showAnalytics} onOpenChange={setShowAnalytics} />
      <RulesDialog link={link} open={showRules} onOpenChange={setShowRules} trigger={null} />
      <QrDialog open={showQr} onOpenChange={setShowQr} shortUrl={shortUrl} title={link.title || link.slug} />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-100">
          <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
            Delete Link?
          </DialogTitle>
          <DialogDescription className="text-neutral-400 font-medium">
            Permanently deletes <span className="text-[#00D26A] font-bold">/{link.slug}</span> and all associated analytics. This action is irreversible.
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
