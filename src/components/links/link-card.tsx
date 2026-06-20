"use client";

import { Link as LinkType } from "@/types/links";
import { RulesDialog } from "./rules-dialog";
import { LinkAnalyticsDialog } from "./link-analytics-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  Check,
  ExternalLink,
  MoreVertical,
  BarChart3,
  Settings2,
  Trash2,
  Globe,
  QrCode,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { QrDialog } from "@/components/qr/qr-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { buildShortUrl } from "@/lib/url-normalize";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CollectionOption {
  id: string;
  name: string;
}

interface LinkCardProps {
  link: LinkType;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  collections?: CollectionOption[];
}

export function LinkCard({
  link,
  onToggleActive,
  onDelete,
  selected,
  onToggleSelect,
  collections,
}: LinkCardProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  let hostname = "";
  try {
    hostname = new URL(link.destination_url).hostname.replace("www.", "");
  } catch {}

  const shortUrl = buildShortUrl(link.slug);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    onDelete(link.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Card className="glass-card bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 border-white/5 relative overflow-hidden group">
        {/* Glow effect on hover */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D26A]/5 blur-[60px] rounded-full group-hover:bg-[#00D26A]/10 transition-all duration-500 -z-10 pointer-events-none" />

        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Selection checkbox */}
            {onToggleSelect && (
              <button
                onClick={onToggleSelect}
                className={cn(
                  "shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all mt-1",
                  selected
                    ? "bg-[#00D26A] border-[#00D26A] text-black"
                    : "border-white/10 hover:border-white/30 text-transparent"
                )}
              >
                {selected && <Check className="w-3 h-3" />}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {/* Favicon */}
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 overflow-hidden">
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
                <h3
                  onClick={() => router.push(`/dashboard/links/${link.id}`)}
                  className="text-lg font-black text-white truncate cursor-pointer hover:text-[#00D26A] transition-colors"
                  title="Edit link"
                >
                  {link.title || "Untitled Link"}
                </h3>
                <div
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                    link.is_active
                      ? "bg-[#39FF14]/10 text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.1)]"
                      : "bg-neutral-800 text-neutral-500",
                  )}
                >
                  {link.is_active ? "Live" : "Paused"}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div
                  className="flex items-center gap-2 group/url cursor-pointer min-w-0"
                  onClick={copyToClipboard}
                >
                  <span className="text-sm font-bold text-[#00D26A] truncate">
                    {shortUrl}
                  </span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5 hover:bg-[#00D26A]/10 hover:border-[#00D26A]/20 text-neutral-400 hover:text-[#00D26A] transition-all text-[10px] font-bold"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                    Destination
                  </span>
                  <span className="text-xs text-neutral-400 font-medium truncate max-w-[200px]">
                    {link.destination_url}
                  </span>
                </div>
                <div className="flex flex-col shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                    Clicks
                  </span>
                  <span className="text-xs text-white font-bold">
                    {link.click_count || 0}
                  </span>
                </div>
                <div className="flex flex-col shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                    Created
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">
                    {new Date(link.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {link.click_goal && link.click_goal > 0 && (
                  <div className="flex flex-col shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                      Goal
                    </span>
                    <span className="text-xs text-[#00D26A] font-bold">
                      {link.click_count || 0}/{link.click_goal} {link.click_goal_period || "daily"}
                    </span>
                  </div>
                )}
                {link.collection_id && collections && (
                  <div className="flex flex-col shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                      Collection
                    </span>
                    <span className="text-xs text-purple-400 font-medium">
                      {collections.find((c) => c.id === link.collection_id)?.name || "—"}
                    </span>
                  </div>
                )}
                {(link.redirect_rules as any[])?.length > 0 && (
                  <div className="flex flex-col shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                      Rules
                    </span>
                    <span className="text-xs text-amber-400 font-medium">
                      {(link.redirect_rules as any[]).length} active
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!link.is_active}
                  onCheckedChange={(checked) =>
                    onToggleActive(link.id, checked)
                  }
                  className="data-[state=checked]:bg-[#00D26A]"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id={`link-actions-trigger-${link.id}`}
                    nativeButton={true}
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-500 hover:text-white rounded-lg hover:bg-white/5"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent
                    align="end"
                    className="glass-card bg-black/90 border-white/10"
                  >
                    <DropdownMenuItem
                      className="text-xs font-bold gap-2 focus:bg-[#00D26A]/10 focus:text-[#00D26A]"
                      onClick={() => router.push(`/dashboard/links/${link.id}`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-bold gap-2 focus:bg-[#00D26A]/10 focus:text-[#00D26A]"
                      onClick={() =>
                        window.open(link.destination_url, "_blank")
                      }
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Original
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-bold gap-2 focus:bg-[#00D26A]/10 focus:text-[#00D26A]"
                      onClick={() => {
                        setTimeout(() => setShowAnalytics(true), 0);
                      }}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-bold gap-2 focus:bg-[#00D26A]/10 focus:text-[#00D26A]"
                      onClick={() => {
                        // Small delay to let the dropdown close before opening the dialog
                        setTimeout(() => setShowRules(true), 0);
                      }}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Edit Rules
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-bold gap-2 focus:bg-[#00D26A]/10 focus:text-[#00D26A]"
                      onClick={() => {
                        setTimeout(() => setShowQr(true), 0);
                      }}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Generate QR
                    </DropdownMenuItem>
                    <div className="h-px bg-white/5 my-1" />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-500/70 hover:text-red-500 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Link
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  id={`link-rules-button-${link.id}`}
                  onClick={() => setShowRules(true)}
                  className="h-8 rounded-lg border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#39FF14] hover:border-[#00D26A]/20 transition-all"
                >
                  <Settings2 className="w-3 h-3 mr-1" />
                  Rules
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
              Delete Link?
            </DialogTitle>
            <DialogDescription className="text-neutral-400 font-medium">
              This action will permanently delete{" "}
              <span className="text-[#00D26A] font-bold">/{link.slug}</span> and
              all associated analytics telemetry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
            >
              Abort
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg"
            >
              Confirm Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinkAnalyticsDialog linkId={link.id} open={showAnalytics} onOpenChange={setShowAnalytics} />

      <RulesDialog
        link={link}
        open={showRules}
        onOpenChange={setShowRules}
        trigger={null}
      />

      <QrDialog
        open={showQr}
        onOpenChange={setShowQr}
        shortUrl={shortUrl}
        title={link.title || link.slug}
      />

    </>
  );
}
