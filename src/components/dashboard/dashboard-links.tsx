"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link as LinkType } from "@/types/links";
import { List, Copy, Check, Globe, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { buildShortUrl } from "@/lib/url-normalize";

interface DashboardLinksProps {
  links: LinkType[];
  loading?: boolean;
}

export function DashboardLinks({ links, loading }: DashboardLinksProps) {
  const recentLinks = links.slice(0, 5);

  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
      <CardHeader className="pt-8 px-8 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <List className="w-5 h-5 text-[#00D26A]" />
            Your Links
          </CardTitle>
          <Link
            href="/dashboard/links"
            className="text-[10px] font-black uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] transition-colors"
          >
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : recentLinks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500 font-medium">No links yet</p>
            <p className="text-xs text-neutral-600 mt-1">
              Create your first link above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentLinks.map((link) => (
              <LinkRow key={link.id} link={link} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LinkRow({ link }: { link: LinkType }) {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  let hostname = "";
  try {
    hostname = new URL(link.destination_url).hostname.replace("www.", "");
  } catch {}

  const shortUrl =
    typeof window !== "undefined" ? buildShortUrl(link.slug) : link.slug;

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors group">
      {/* Favicon */}
      <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0 overflow-hidden">
        {hostname && !faviconError ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
            alt=""
            className="w-4 h-4"
            onError={() => setFaviconError(true)}
          />
        ) : (
          <Globe className="w-3.5 h-3.5 text-neutral-500" />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-white truncate block">
          {link.title || "Untitled"}
        </span>
        <span className="text-xs text-[#00D26A] font-medium truncate block">
          {shortUrl}
        </span>
      </div>

      {/* Click count */}
      <span className="text-xs font-black text-neutral-400 shrink-0 hidden sm:block">
        {link.click_count || 0} clicks
      </span>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-[#00D26A] hover:bg-[#00D26A]/10 transition-all"
        title="Copy link"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
