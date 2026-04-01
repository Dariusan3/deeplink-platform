"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Loader2, Link2, BarChart3, MousePointerClick } from "lucide-react";
import { useLinks } from "@/hooks/use-links";
import { useTeam } from "@/hooks/use-team";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ExportType = "links" | "clicks" | "full";

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("full");
  const { links } = useLinks();
  const { activeTeam } = useTeam();
  const supabase = useMemo(() => createClient(), []);

  const exportOptions: { type: ExportType; label: string; description: string; icon: React.ReactNode }[] = [
    {
      type: "links",
      label: "Links Only",
      description: "Slug, title, destination URL, status, created date",
      icon: <Link2 className="w-4 h-4" />,
    },
    {
      type: "clicks",
      label: "Click Data",
      description: "Every click with timestamp, country, city, device, browser, referrer",
      icon: <MousePointerClick className="w-4 h-4" />,
    },
    {
      type: "full",
      label: "Full Report",
      description: "Links + click data combined — like the screenshot",
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  const handleExport = async () => {
    if (!activeTeam?.id || links.length === 0) {
      toast.error("No links to export");
      return;
    }

    setExporting(true);

    try {
      const linkIds = links.map((l) => l.id);
      let csv = "";

      if (exportType === "links") {
        // Export links metadata only
        csv = "Short URL,Slug,Title,Destination URL,Status,Click Goal,Created At\n";
        for (const link of links) {
          const shortUrl = `${window.location.origin}/${link.slug}`;
          csv += `"${shortUrl}","${link.slug}","${(link.title || "").replace(/"/g, '""')}","${link.destination_url}","${link.is_active ? "active" : "paused"}","${link.click_goal || ""}","${link.created_at}"\n`;
        }
      } else if (exportType === "clicks") {
        // Export raw click data
        const { data: clicks } = await supabase
          .from("link_clicks")
          .select("*, links!inner(slug, title)")
          .in("link_id", linkIds)
          .order("clicked_at", { ascending: false })
          .limit(10000);

        csv = "Short URL,Date,Country,Device Type,User Agent,Referrer\n";
        for (const click of clicks || []) {
          const link = click.links as any;
          const shortUrl = `${window.location.origin}/${link?.slug || ""}`;
          csv += `"${shortUrl}","${click.clicked_at}","${click.country || ""}","${click.device_type || ""}","${(click.user_agent || "").replace(/"/g, '""')}","${click.referer || "direct"}"\n`;
        }
      } else {
        // Full report — links + clicks combined (like Angello's screenshot)
        const { data: clicks } = await supabase
          .from("link_clicks")
          .select("*, links!inner(slug, title, destination_url)")
          .in("link_id", linkIds)
          .order("clicked_at", { ascending: false })
          .limit(10000);

        csv = "Short URL,Date,Country,Device Type,Browser,Referrer,Destination URL\n";
        for (const click of clicks || []) {
          const link = click.links as any;
          const shortUrl = `${window.location.origin}/${link?.slug || ""}`;
          // Extract browser from user agent
          const ua = click.user_agent || "";
          let browser = "Unknown";
          if (ua.includes("Instagram")) browser = "Instagram";
          else if (ua.includes("Chrome")) browser = "Chrome";
          else if (ua.includes("Safari")) browser = "Safari";
          else if (ua.includes("Firefox")) browser = "Firefox";
          else if (ua.includes("Edge")) browser = "Edge";
          else if (ua.includes("Google")) browser = "Google App";

          csv += `"${shortUrl}","${click.clicked_at}","${click.country || ""}","${click.device_type || ""}","${browser}","${click.referer || "direct"}","${link?.destination_url || ""}"\n`;
        }
      }

      // Download the CSV
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `tappr-${exportType}-${activeTeam.name.toLowerCase().replace(/\s+/g, "-")}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportType} data as CSV`);
      setOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id="export-dialog-trigger"
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        }
      />
      <DialogContent className="glass-card bg-black/95 border-white/5 text-white sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#00D26A]/10 text-[#00D26A]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            Export Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
            Choose what to export
          </p>
          {exportOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setExportType(opt.type)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                exportType === opt.type
                  ? "bg-[#00D26A]/5 border-[#00D26A]/20"
                  : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg shrink-0 mt-0.5",
                exportType === opt.type ? "bg-[#00D26A]/10 text-[#00D26A]" : "bg-white/5 text-neutral-500"
              )}>
                {opt.icon}
              </div>
              <div>
                <p className={cn(
                  "text-sm font-bold",
                  exportType === opt.type ? "text-white" : "text-neutral-300"
                )}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{opt.description}</p>
              </div>
              {exportType === opt.type && (
                <div className="ml-auto mt-1 w-2 h-2 rounded-full bg-[#00D26A] shadow-[0_0_8px_rgba(0,210,106,0.6)]" />
              )}
            </button>
          ))}

          <p className="text-[9px] text-neutral-600 pt-2">
            {links.length} links · Max 10,000 click rows · UTF-8 encoded CSV
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="font-bold">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || links.length === 0}
            className="btn-primary-pulse font-black uppercase tracking-widest text-xs text-black"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download CSV</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
