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
import { CreateLinkDialog } from "@/components/links/create-link-dialog";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { Plus, Search, Globe, Check, FolderInput } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddLinkToCollectionDialogProps {
  collectionId: string;
  collectionName: string;
}

export function AddLinkToCollectionDialog({
  collectionId,
  collectionName,
}: AddLinkToCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);

  const { links } = useLinks();
  const { moveLinksToCollection } = useCollections();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="btn-primary-pulse rounded-xl h-11 px-6 font-black uppercase text-xs tracking-widest gap-2">
            <Plus className="w-4 h-4" />
            Add Link
          </Button>
        }
      />
      <DialogContent className="glass-card bg-black/95 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <FolderInput className="w-5 h-5" />
            </div>
            Add Link to {collectionName}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search existing links by title, path or URL"
            className="pl-9 bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11"
          />
        </div>

        {/* Existing links list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1.5 min-h-0">
          {candidateLinks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-neutral-500 font-medium">
                {query.trim()
                  ? "No matching links."
                  : "All your links are already in this collection."}
              </p>
            </div>
          ) : (
            candidateLinks.map((link) => {
              const isMoving = movingId === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  disabled={isMoving}
                  onClick={() => handleAddExisting(link.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#00D26A]/5 hover:border-[#00D26A]/20 transition-all text-left group",
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

        {/* Create new link CTA */}
        <div className="pt-3 border-t border-white/5">
          <CreateLinkDialog
            defaultCollectionId={collectionId}
            trigger={
              <Button
                variant="ghost"
                className="w-full h-11 rounded-xl border border-dashed border-white/10 hover:border-[#00D26A]/40 hover:bg-[#00D26A]/5 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-[#00D26A] transition-all gap-2"
              >
                <Plus className="w-4 h-4" />
                Or Create a New Link
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
