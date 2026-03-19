"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download } from "lucide-react";
import { useLinks } from "@/hooks/use-links";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ParsedRow {
  url: string;
  title?: string;
  slug?: string;
  status: "pending" | "success" | "error" | "processing";
  error?: string;
}

function generateSlug() {
  return Math.random().toString(36).substring(2, 8);
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length === 0) return [];

  // Try to detect headers
  const firstLine = lines[0].toLowerCase();
  const hasHeaders = firstLine.includes("url") || firstLine.includes("destination");
  const dataLines = hasHeaders ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const url = cols[0] || "";
      const title = cols[1] || undefined;
      const slug = cols[2] || generateSlug();

      if (!url || !url.startsWith("http")) {
        return { url, title, slug, status: "error" as const, error: "Invalid URL" };
      }
      return { url, title, slug, status: "pending" as const };
    })
    .filter((r) => r.url);
}

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { createLink } = useLinks();

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setImporting(true);

    const pendingRows = rows.filter((r) => r.status === "pending");
    for (let i = 0; i < pendingRows.length; i++) {
      const row = pendingRows[i];
      setRows((prev) =>
        prev.map((r) => (r === row ? { ...r, status: "processing" } : r))
      );

      try {
        await createLink({
          destination_url: row.url,
          slug: row.slug || generateSlug(),
          title: row.title || null,
          is_active: true,
        });
        setRows((prev) =>
          prev.map((r) => (r === row ? { ...r, status: "success" } : r))
        );
      } catch {
        setRows((prev) =>
          prev.map((r) => (r === row ? { ...r, status: "error", error: "Import failed" } : r))
        );
      }
    }

    setImporting(false);
    toast.success("Import complete");
  };

  const downloadTemplate = () => {
    const csv = `destination_url,title,custom_slug\nhttps://example.com/page1,My First Link,my-link-1\nhttps://example.com/page2,My Second Link,`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deeplink-import-template.csv";
    a.click();
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRows([]); }}>
      <DialogTrigger
        id="bulk-import-dialog-trigger"
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
        }
      />
      <DialogContent className="glass-card bg-black/95 border-white/5 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#00D26A]/10 text-[#00D26A]">
              <Upload className="w-4 h-4" />
            </div>
            Bulk Import Links
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop zone */}
          {rows.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                dragOver
                  ? "border-[#00D26A] bg-[#00D26A]/5"
                  : "border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02]"
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <FileText className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
              <p className="text-sm font-bold text-white">Drop your CSV file here</p>
              <p className="text-xs text-neutral-500 mt-1">or click to browse</p>
              <p className="text-[10px] text-neutral-600 mt-3">
                Columns: destination_url, title (optional), custom_slug (optional)
              </p>
            </div>
          )}

          {/* Template download */}
          {rows.length === 0 && (
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-white/5 text-xs text-neutral-500 hover:text-[#00D26A] hover:border-[#00D26A]/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV template
            </button>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">{rows.length} links detected</span>
                <div className="flex gap-3">
                  {pendingCount > 0 && <span className="text-neutral-400">{pendingCount} pending</span>}
                  {successCount > 0 && <span className="text-[#00D26A]">{successCount} imported</span>}
                  {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
                </div>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl text-xs",
                      row.status === "success" ? "bg-[#00D26A]/5 border border-[#00D26A]/10" :
                      row.status === "error" ? "bg-red-500/5 border border-red-500/10" :
                      row.status === "processing" ? "bg-white/[0.02] border border-white/5 animate-pulse" :
                      "bg-white/[0.02] border border-white/5"
                    )}
                  >
                    <div className="shrink-0">
                      {row.status === "success" ? (
                        <CheckCircle className="w-4 h-4 text-[#00D26A]" />
                      ) : row.status === "error" ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : row.status === "processing" ? (
                        <Loader2 className="w-4 h-4 text-[#00D26A] animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{row.title || row.url}</p>
                      <p className="text-neutral-500 truncate">{row.url}</p>
                    </div>
                    <span className="text-neutral-600 font-mono shrink-0">/{row.slug}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setRows([])}
                className="text-xs text-neutral-500 hover:text-white transition-colors"
              >
                Clear and upload different file
              </button>
            </>
          )}
        </div>

        <DialogFooter>
          {rows.length > 0 && pendingCount > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary-pulse font-black uppercase tracking-widest text-xs text-black"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Import {pendingCount} Links</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
