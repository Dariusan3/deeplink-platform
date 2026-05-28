"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { normalizeDestinationUrl, sanitizePath } from "@/lib/url-normalize";
import {
  Plus,
  Search,
  Globe,
  Check,
  FolderInput,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddLinkToCollectionDialogProps {
  collectionId: string;
  collectionName: string;
}

const PAGE_SIZE = 3;

export function AddLinkToCollectionDialog({
  collectionId,
  collectionName,
}: AddLinkToCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Inline create-link form state — embedded directly in this dialog
  // instead of bouncing the user through a second dialog.
  const [createOpen, setCreateOpen] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const { links, createLink } = useLinks();
  const { moveLinksToCollection } = useCollections();

  // useLinks already orders by created_at desc — newest first.
  const candidateLinks = useMemo(() => {
    const others = links.filter((l) => l.collection_id !== collectionId);
    if (!query.trim()) return others;
    const q = query.trim().toLowerCase();
    return others.filter(
      (l) =>
        l.title?.toLowerCase().includes(q) ||
        l.slug.toLowerCase().includes(q) ||
        l.destination_url.toLowerCase().includes(q)
    );
  }, [links, collectionId, query]);

  // Reset page when the filtered list shrinks below the current offset.
  const totalPages = Math.max(1, Math.ceil(candidateLinks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const visibleLinks = candidateLinks.slice(start, start + PAGE_SIZE);

  const handleAddExisting = async (linkId: string) => {
    setMovingId(linkId);
    try {
      await moveLinksToCollection([linkId], collectionId);
      toast.success("Link added to collection");
    } catch {
      // moveLinksToCollection logs/toasts on error
    } finally {
      setMovingId(null);
    }
  };

  const resetCreateForm = () => {
    setDestinationUrl("");
    setSlug("");
    setTitle("");
    setCreateOpen(false);
  };

  const handleCreateInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl.trim()) {
      toast.error("Destination URL is required");
      return;
    }

    setCreating(true);
    try {
      // Generate a random slug if the user didn't pick one — matches
      // the behaviour of the main create-link dialog.
      const finalSlug = slug.trim() || Math.random().toString(36).slice(2, 8);

      await createLink({
        slug: finalSlug,
        destination_url: normalizeDestinationUrl(destinationUrl),
        title: title.trim() || null,
        collection_id: collectionId,
        is_active: true,
      });
      toast.success("Link created and added to collection");
      // Close the whole dialog — the user's done. The onOpenChange handler
      // calls resetCreateForm so the inline form is fresh next time.
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create link";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetCreateForm(); }}>
      <DialogTrigger
        render={
          <Button className="btn-primary-pulse rounded-xl h-11 px-6 font-black uppercase text-xs tracking-widest gap-2">
            <Plus className="w-4 h-4" />
            Add Link
          </Button>
        }
      />
      <DialogContent className="glass-card bg-black/95 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[520px] max-h-[90vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <FolderInput className="w-5 h-5" />
            </div>
            Add Link to {collectionName}
          </DialogTitle>
        </DialogHeader>

        {/* ── Inline "Create new link" form (collapsible) ───────────── */}
        <div className="mt-3">
          {!createOpen ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="w-full h-11 rounded-xl border border-dashed border-[#00D26A]/30 hover:border-[#00D26A]/60 hover:bg-[#00D26A]/5 text-xs font-black uppercase tracking-widest text-[#00D26A] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create a new link in this collection
            </button>
          ) : (
            <form
              onSubmit={handleCreateInline}
              className="p-4 rounded-xl border border-[#00D26A]/20 bg-[#00D26A]/[0.03] space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                  New link
                </p>
                <button
                  type="button"
                  onClick={resetCreateForm}
                  className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>

              <Input
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://example.com/promo"
                className="h-10 bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-lg text-sm"
                autoFocus
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="h-9 bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-lg text-xs"
                />
                <Input
                  value={slug}
                  onChange={(e) => setSlug(sanitizePath(e.target.value))}
                  placeholder="Custom path (optional)"
                  className="h-9 bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-lg text-xs font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={creating || !destinationUrl.trim()}
                className="w-full h-10 btn-primary-pulse text-black font-black uppercase tracking-widest text-xs rounded-lg gap-2"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {creating ? "Creating…" : "Create & add to collection"}
              </Button>
            </form>
          )}
        </div>

        {/* ── Or pick from existing ────────────────────────────────── */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Or pick from your recent links
            </p>
            <span className="text-[10px] text-neutral-600 font-bold">
              {candidateLinks.length} available
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search by title, path or URL"
              className="pl-9 bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-10 text-sm"
            />
          </div>

          {/* Paginated list — 3 at a time */}
          <div className="space-y-1.5">
            {candidateLinks.length === 0 ? (
              <div className="text-center py-6 rounded-xl border border-dashed border-white/5">
                <p className="text-xs text-neutral-500 font-medium">
                  {query.trim()
                    ? "No matching links."
                    : "All your links are already in this collection."}
                </p>
              </div>
            ) : (
              visibleLinks.map((link) => {
                const isMoving = movingId === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    disabled={isMoving}
                    onClick={() => handleAddExisting(link.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#00D26A]/5 hover:border-[#00D26A]/20 transition-all text-left",
                      isMoving && "opacity-60 cursor-wait"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {link.title || link.slug}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate">
                        {link.destination_url}
                      </p>
                    </div>
                    {link.collection_id && !isMoving && (
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest shrink-0">
                        Move
                      </span>
                    )}
                    {isMoving && (
                      <Check className="w-4 h-4 text-[#00D26A] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination arrows */}
          {candidateLinks.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className={cn(
                  "h-9 w-9 rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center transition-all",
                  currentPage === 0
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:border-[#00D26A]/40 hover:bg-[#00D26A]/5 hover:text-[#00D26A] text-neutral-400"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                {currentPage + 1} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className={cn(
                  "h-9 w-9 rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center transition-all",
                  currentPage >= totalPages - 1
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:border-[#00D26A]/40 hover:bg-[#00D26A]/5 hover:text-[#00D26A] text-neutral-400"
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
