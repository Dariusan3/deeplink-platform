"use client";

import { useState } from "react";
import { Plus, Link as LinkIcon, Sparkles } from "lucide-react";
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
import { toast } from "sonner";

export function CreateLinkDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [slug, setSlug] = useState("");
  const { createLink } = useLinks();
  const { activeTeam, loading: teamLoading } = useTeam();

  const handleGenerateSlug = () => {
    const newSlug = Math.random().toString(36).substring(2, 8);
    setSlug(newSlug);
    toast.success("Magic slug generated!");
  };

  const isValidUrl = (url: string) => {
    return /^https?:\/\/.+\..+/.test(url.trim());
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

    setLoading(true);
    try {
      const finalSlug = slug || Math.random().toString(36).substring(2, 8);
      await createLink({
        title: title || "New Link",
        destination_url: destinationUrl,
        slug: finalSlug,
        is_active: true,
      });
      toast.success("Deeplink created successfully!");
      setOpen(false);
      resetForm();
    } catch (error: any) {
      const message = error.message || "Failed to create link. Slugs must be unique.";
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id="create-link-dialog-trigger"
        render={
          <Button className="btn-primary-pulse rounded-xl h-11 px-6 font-black uppercase text-xs tracking-widest gap-2">
            <Plus className="w-4 h-4" />
            Create Deeplink
          </Button>
        }
      />
      <DialogContent className="glass-card bg-black/90 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <LinkIcon className="w-5 h-5" />
            </div>
            Generate New Link
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
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
              Custom Slug (Optional)
            </Label>
            <div className="relative">
              <Input
                id="slug"
                placeholder="summer-promo"
                className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl pr-10"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-[#39FF14] transition-colors"
                title="Generate random slug"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-tight">
              Example: dplnk.co/<span className="text-[#00D26A]">{slug || "magic-slug"}</span>
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading || !activeTeam || teamLoading}
              className="w-full btn-primary font-black uppercase text-xs tracking-[0.2em] rounded-xl h-12 shadow-[0_0_30px_rgba(0,210,106,0.2)]"
            >
              {loading ? "Initializing..." : teamLoading ? "Provisioning..." : !activeTeam ? "Team Required" : "Activate Security Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
