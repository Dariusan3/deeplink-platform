"use client";

import { useState } from "react";
import { Link as LinkIcon, Copy, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLinks } from "@/hooks/use-links";
import { useTeam } from "@/hooks/use-team";
import { toast } from "sonner";

export function QuickCreate() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { createLink } = useLinks();
  const { activeTeam } = useTeam();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please paste a URL first");
      return;
    }

    setLoading(true);
    try {
      let title = "New Link";
      try {
        title = new URL(url).hostname.replace("www.", "");
      } catch {}

      const slug = Math.random().toString(36).substring(2, 8);
      await createLink({
        title,
        destination_url: url,
        slug,
        is_active: true,
      });

      setCreatedSlug(slug);
      toast.success("Link created!");

      // Reset after 5 seconds
      setTimeout(() => {
        setCreatedSlug(null);
        setUrl("");
      }, 5000);
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const copyShortUrl = () => {
    if (!createdSlug) return;
    const shortUrl = `${window.location.host}/${createdSlug}`;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shortUrl = createdSlug
    ? `${typeof window !== "undefined" ? window.location.host : ""}/${createdSlug}`
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
              className="shrink-0 h-12 w-12 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-neutral-400 hover:text-white"
              onClick={() => {
                window.location.href = "/dashboard/links";
              }}
              title="Advanced options"
            >
              <Settings2 className="w-5 h-5" />
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
      </CardContent>
    </Card>
  );
}
