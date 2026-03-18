"use client";

import { useState } from "react";
import { FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollections, Collection } from "@/hooks/use-collections";

interface MoveToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkIds: string[];
  onMoved: () => void;
}

export function MoveToCollectionDialog({
  open,
  onOpenChange,
  linkIds,
  onMoved,
}: MoveToCollectionDialogProps) {
  const { collections, moveLinksToCollection } = useCollections();
  const [loading, setLoading] = useState(false);

  const handleMove = async (collectionId: string | null) => {
    setLoading(true);
    try {
      await moveLinksToCollection(linkIds, collectionId);
      onMoved();
      onOpenChange(false);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#00D26A]" />
            Move to Collection
          </DialogTitle>
          <p className="text-sm text-neutral-500 font-medium">
            {linkIds.length} link{linkIds.length !== 1 ? "s" : ""} selected
          </p>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <button
            onClick={() => handleMove(null)}
            disabled={loading}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left"
          >
            <X className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-bold text-neutral-400">Remove from collection</span>
          </button>
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => handleMove(col.id)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left"
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: col.color || "#00D26A" }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-white">{col.name}</span>
                {col.link_count !== undefined && (
                  <span className="text-[10px] text-neutral-500 ml-2">
                    {col.link_count} link{col.link_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </button>
          ))}
          {collections.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">
              No collections yet. Create one first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
