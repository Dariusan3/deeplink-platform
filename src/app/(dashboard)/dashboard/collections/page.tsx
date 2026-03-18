"use client";

import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/hooks/use-collections";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import { FolderOpen, Trash2, Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function CollectionsPage() {
  const { collections, loading, deleteCollection } = useCollections();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCollection(deleteId);
    setDeleteId(null);
  };

  return (
    <>
      <Header title="Collections" />
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Collections
            </h2>
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
              Organize Your Links Into Groups
            </p>
          </div>
          <CreateCollectionDialog />
        </div>

        {loading && collections.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card bg-white/[0.01] border-white/5 p-6 rounded-[32px] h-[140px]">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/2 rounded-lg" />
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <Card className="glass-card bg-white/[0.01] border-white/5 border-dashed relative overflow-hidden mt-8">
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,210,106,0.05)] border border-[#00D26A]/10">
                <FolderOpen className="w-10 h-10 text-[#00D26A]/40" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">No Collections Yet</h3>
              <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                Create collections to organize your links into logical groups.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {collections.map((col) => (
              <Card
                key={col.id}
                className="glass-card bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 border-white/5 relative overflow-hidden group"
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full transition-all duration-500"
                  style={{ backgroundColor: `${col.color || "#00D26A"}33` }}
                />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${col.color || "#00D26A"}15` }}
                      >
                        <FolderOpen
                          className="w-5 h-5"
                          style={{ color: col.color || "#00D26A" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-white truncate">
                          {col.name}
                        </h3>
                        {col.description && (
                          <p className="text-xs text-neutral-500 truncate">
                            {col.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(col.id)}
                      className="h-8 w-8 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <LinkIcon className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-xs font-bold text-neutral-400">
                      {col.link_count || 0} link{(col.link_count || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-[400px]">
          <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
            Delete Collection?
          </DialogTitle>
          <DialogDescription className="text-neutral-400 font-medium">
            Links in this collection will not be deleted — they will be unassigned.
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteId(null)}
              className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
