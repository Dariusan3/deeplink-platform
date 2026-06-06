"use client";

import { useState, useEffect } from "react";
import { Plus, Link as LinkIcon, Sparkles, Settings2, ChevronDown, ChevronUp, Globe, FolderOpen, StickyNote, Target, Copy, Check, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLinks } from "@/hooks/use-links";
import { useTeam } from "@/hooks/use-team";
import { useCollections } from "@/hooks/use-collections";
import { useSettings } from "@/hooks/use-settings";
import { normalizeDestinationUrl, sanitizePath, buildShortUrl } from "@/lib/url-normalize";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateLinkDialogProps {
  // Pre-select a collection — used by the collection detail page so a link
  // created from there is automatically assigned to that collection.
  defaultCollectionId?: string | null;
  // Override the trigger button. Defaults to the green "Create Deeplink" CTA.
  trigger?: React.ReactElement;
  // Controlled mode — pass `open` + `onOpenChange` to launch from
  // outside (e.g. the canvas "+" hover button on a collection node).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Hide the trigger button entirely; useful in controlled mode when
  // the caller already has its own button.
  triggerless?: boolean;
}

export function CreateLinkDialog({ defaultCollectionId, trigger, open: openProp, onOpenChange, triggerless = false }: CreateLinkDialogProps = {}) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setOpenInternal(v);
  };
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [slug, setSlug] = useState("");
  // Post-create success state — populated when settings.show_link_creation_confirmation
  // is true. The dialog stays open with a copyable success card; otherwise we
  // toast and close immediately.
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(!!defaultCollectionId);
  const [collectionId, setCollectionId] = useState<string | null>(defaultCollectionId ?? null);
  const [clickGoal, setClickGoal] = useState("");
  const [clickGoalPeriod, setClickGoalPeriod] = useState("daily");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { createLink } = useLinks();
  const { activeTeam, loading: teamLoading } = useTeam();
  const { collections } = useCollections();
  const { settings } = useSettings();

  // Pre-fill destination with team's default_domain when the dialog opens
  // and the field is empty. User can still override.
  useEffect(() => {
    if (open && !destinationUrl && settings?.default_domain) {
      setDestinationUrl(settings.default_domain);
    }
    // We only want to prefill on open transitions, not on every settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sync the collection picker whenever the dialog is opened for a new
  // context (e.g. the "+ Link" button on a different folder fires with a
  // fresh defaultCollectionId). Without this, the dialog stays mounted
  // across opens and `collectionId` is frozen at its initial useState
  // value — so the created link ends up with NO collection, never shows
  // up on the canvas. This was the bug.
  useEffect(() => {
    if (open) {
      setCollectionId(defaultCollectionId ?? null);
      setShowAdvanced(!!defaultCollectionId);
    }
  }, [open, defaultCollectionId]);

  const handleGenerateSlug = () => {
    const newSlug = Math.random().toString(36).substring(2, 8);
    setSlug(newSlug);
    toast.success("Custom path generated!");
  };

  const isValidUrl = (url: string) => {
    return /^https?:\/\/.+\..+/.test(url.trim());
  };

  const isOwnDomain = (url: string) => {
    if (typeof window === "undefined") return false;
    try {
      return new URL(url.trim()).hostname === window.location.hostname;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl) {
      toast.error("Destination URL is required");
      return;
    }
    if (!isValidUrl(destinationUrl)) {
      toast.error("Please enter a valid URL (e.g. https://example.com)");
      return;
    }
    if (isOwnDomain(destinationUrl)) {
      toast.error("You can't shorten a link that already points to this platform.");
      return;
    }

    setLoading(true);
    try {
      const finalSlug = slug || Math.random().toString(36).substring(2, 8);
      await createLink({
        title: title || "New Link",
        destination_url: normalizeDestinationUrl(destinationUrl),
        slug: finalSlug,
        is_active: isActive,
        collection_id: collectionId || undefined,
        click_goal: clickGoal ? Number(clickGoal) : undefined,
        click_goal_period: clickGoal ? clickGoalPeriod : undefined,
      });

      // Setting ON (default): keep dialog open with a success card so the
      //   user can copy / open / generate QR before dismissing.
      // Setting OFF: toast + close immediately.
      if (settings?.show_link_creation_confirmation === false) {
        toast.success("Deeplink created");
        setOpen(false);
        resetForm();
      } else {
        setCreatedSlug(finalSlug);
      }
    } catch (error: any) {
      const message = error.message || "Failed to create link. Custom paths must be unique.";
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDestinationUrl("");
    setSlug("");
    setCreatedSlug(null);
    setCopied(false);
    // Keep the default collection so re-opening the dialog from a collection
    // page doesn't drop the context.
    setCollectionId(defaultCollectionId ?? null);
    setClickGoal("");
    setClickGoalPeriod("daily");
    setNotes("");
    setIsActive(true);
    setShowAdvanced(!!defaultCollectionId);
  };

  const successUrl = createdSlug ? buildShortUrl(createdSlug) : "";

  const copySuccessUrl = () => {
    if (!successUrl) return;
    navigator.clipboard.writeText(successUrl);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      {!triggerless && (
        <DialogTrigger
          id="create-link-dialog-trigger"
          render={
            trigger ?? (
              <Button className="btn-primary-pulse rounded-xl h-11 px-6 font-black uppercase text-xs tracking-widest gap-2">
                <Plus className="w-4 h-4" />
                Create Deeplink
              </Button>
            )
          }
        />
      )}
      <DialogContent className="glass-card bg-black/90 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[480px] max-h-[90vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              {createdSlug ? <CheckCircle2 className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            </div>
            {createdSlug ? "Link Created" : "Generate New Link"}
          </DialogTitle>
        </DialogHeader>

        {createdSlug ? (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-[#00D26A]/5 border border-[#00D26A]/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#00D26A] mb-2">Your short URL</p>
              <p className="text-sm font-bold text-white break-all font-mono">{successUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={copySuccessUrl}
                className="h-11 rounded-xl bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-[10px] tracking-widest gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                onClick={() => window.open(successUrl, "_blank")}
                variant="outline"
                className="h-11 rounded-xl border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </Button>
            </div>
            <p className="text-[10px] text-neutral-500 text-center">
              Tip: turn off this confirmation in Settings → Display.
            </p>
            <Button
              onClick={() => { setOpen(false); resetForm(); }}
              variant="ghost"
              className="w-full h-10 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-white"
            >
              Done
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
              Title (Internal)
            </Label>
            <Input
              id="title"
              placeholder="Summer Promo 2025"
              className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url" className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
              Destination URL
            </Label>
            <Input
              id="url"
              placeholder="https://example.com/promo"
              className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
              Custom Path (Optional)
            </Label>
            <div className="relative">
              <Input
                id="slug"
                placeholder="summer-promo (any path)"
                className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl pr-10"
                value={slug}
                onChange={(e) => setSlug(sanitizePath(e.target.value))}
              />
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#39FF14] transition-colors"
                title="Generate random path"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-neutral-500 font-bold tracking-tight">
              <span className="uppercase">Example: https://tappr.me/</span><span className="text-[#00D26A]">{slug || "your-path"}</span>
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 w-full py-2.5 text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Advanced Options
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1 border-t border-white/5">
              {/* Collection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3 text-[#00D26A]" /> Collection
                </Label>
                <select
                  value={collectionId || ""}
                  onChange={(e) => setCollectionId(e.target.value || null)}
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-neutral-900">No collection</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id} className="bg-neutral-900">{col.name}</option>
                  ))}
                </select>
              </div>

              {/* Click Goal */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-[#00D26A]" /> Click Goal
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 100"
                    className="bg-white/[0.03] border-white/10 rounded-xl h-10 text-sm w-28"
                    value={clickGoal}
                    onChange={(e) => setClickGoal(e.target.value)}
                  />
                  <span className="text-xs text-neutral-500 font-bold">clicks per</span>
                  <select
                    value={clickGoalPeriod}
                    onChange={(e) => setClickGoalPeriod(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
                  >
                    <option value="daily" className="bg-neutral-900">Day</option>
                    <option value="weekly" className="bg-neutral-900">Week</option>
                    <option value="monthly" className="bg-neutral-900">Month</option>
                  </select>
                </div>
              </div>

              {/* Internal Note */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                  <StickyNote className="w-3 h-3 text-[#00D26A]" /> Internal Note
                </Label>
                <Input
                  placeholder="(not visible to visitors)"
                  className="bg-white/[0.03] border-white/10 rounded-xl h-10 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Start paused */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Start Active</p>
                  <p className="text-[9px] text-neutral-500">Turn off to create as paused</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all",
                    isActive ? "bg-[#00D26A]" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white transition-all mx-0.5",
                    isActive ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              <p className="text-[9px] text-neutral-600 flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                You can add smart routing rules (geo, device, time) after creating the link.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={loading || !activeTeam || teamLoading}
              className="w-full btn-primary font-black uppercase text-xs tracking-[0.2em] rounded-xl h-12 shadow-[0_0_30px_rgba(0,210,106,0.2)]"
            >
              {loading ? "Initializing..." : teamLoading ? "Provisioning..." : !activeTeam ? "Team Required" : "Activate Security Link"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
