"use client";

import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/hooks/use-collections";
import { useLinks } from "@/hooks/use-links";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import {
  FolderOpen,
  Trash2,
  Link as LinkIcon,
  ArrowLeft,
  ExternalLink,
  FolderMinus,
  Globe,
  Target,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CollectionsPage() {
  const { collections, loading, deleteCollection, updateCollection, moveLinksToCollection } =
    useCollections();
  const { links } = useLinks();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCollection(deleteId);
    setDeleteId(null);
    if (activeCollectionId === deleteId) setActiveCollectionId(null);
  };

  const activeCollection = activeCollectionId
    ? collections.find((c) => c.id === activeCollectionId)
    : null;
  const collectionLinks = activeCollectionId
    ? links.filter((l) => l.collection_id === activeCollectionId)
    : [];

  const handleRemoveFromCollection = async (linkId: string) => {
    await moveLinksToCollection([linkId], null);
    toast.success("Link removed from collection");
  };

  // Collection detail view
  if (activeCollection) {
    return (
      <>
        <Header title="Collections" />
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveCollectionId(null)}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collections
          </button>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${activeCollection.color || "#00D26A"}15`,
              }}
            >
              <FolderOpen
                className="w-6 h-6"
                style={{ color: activeCollection.color || "#00D26A" }}
              />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                {activeCollection.name}
              </h2>
              {activeCollection.description && (
                <p className="text-sm text-neutral-500">
                  {activeCollection.description}
                </p>
              )}
            </div>
          </div>

          {/* Click Goal Settings */}
          <Card className="glass-card bg-white/[0.01] border-white/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-[#00D26A]/10 text-[#00D26A]">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Click Goal
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={0}
                  placeholder="Target clicks"
                  value={activeCollection.click_goal ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    updateCollection(activeCollection.id, {
                      click_goal: val,
                      click_goal_period: activeCollection.click_goal_period || "daily",
                    });
                  }}
                  className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50"
                />
                <select
                  value={activeCollection.click_goal_period || "daily"}
                  onChange={(e) =>
                    updateCollection(activeCollection.id, {
                      click_goal: activeCollection.click_goal,
                      click_goal_period: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-[#00D26A]/50 [&>option]:bg-black"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {activeCollection.click_goal && activeCollection.click_goal > 0 && (
                  <button
                    onClick={() =>
                      updateCollection(activeCollection.id, {
                        click_goal: null,
                        click_goal_period: null,
                      })
                    }
                    className="text-xs font-bold text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    Remove goal
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {collectionLinks.length === 0 ? (
            <Card className="glass-card bg-white/[0.01] border-white/5 border-dashed relative overflow-hidden">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/3 flex items-center justify-center mb-4 border border-white/5">
                  <LinkIcon className="w-8 h-8 text-neutral-600" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">
                  No Links in This Collection
                </h3>
                <p className="text-sm text-neutral-500 max-w-sm font-medium">
                  Go to your Links page and use the link menu to add links to
                  this collection.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3 pb-20">
              {collectionLinks.map((link) => (
                <Card
                  key={link.id}
                  className="glass-card bg-white/[0.01] hover:bg-white/3 transition-all duration-300 border-white/5"
                >
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white truncate">
                          {link.title || link.slug}
                        </h4>
                        <p className="text-xs text-neutral-500 truncate">
                          {link.destination_url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-neutral-500">
                        {link.click_count || 0} clicks
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(link.destination_url, "_blank")
                        }
                        className="h-8 w-8 text-neutral-500 hover:text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCollection(link.id)}
                        className="h-8 w-8 text-neutral-500 hover:text-amber-400"
                        title="Remove from collection"
                      >
                        <FolderMinus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

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
              <div
                key={i}
                className="glass-card bg-white/[0.01] border-white/5 p-6 rounded-[32px] h-35"
              >
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
              <h3 className="text-lg font-black text-white mb-2">
                No Collections Yet
              </h3>
              <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                Create collections to organize your links into logical groups.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {collections.map((col) => (
              <div
                key={col.id}
                onClick={() => setActiveCollectionId(col.id)}
                className="glass-card bg-white/[0.01] hover:bg-white/3 transition-all duration-500 border border-white/5 relative overflow-hidden group cursor-pointer rounded-3xl"
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full transition-all duration-500"
                  style={{
                    backgroundColor: `${col.color || "#00D26A"}33`,
                  }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${col.color || "#00D26A"}15`,
                        }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(col.id);
                      }}
                      className="h-8 w-8 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <LinkIcon className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-xs font-bold text-neutral-400">
                      {col.link_count || 0} link
                      {(col.link_count || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-100">
          <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
            Delete Collection?
          </DialogTitle>
          <DialogDescription className="text-neutral-400 font-medium">
            Links in this collection will not be deleted — they will be
            unassigned.
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
