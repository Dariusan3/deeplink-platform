"use client";

import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/hooks/use-collections";
import { useLinks } from "@/hooks/use-links";
import { CreateCollectionDialog, CollectionsInfo } from "@/components/collections/create-collection-dialog";
import { AddLinkToCollectionDialog } from "@/components/collections/add-link-to-collection-dialog";
import { EditCollectionDialog } from "@/components/collections/edit-collection-dialog";
import {
  CollectionsToolbar,
  type CollectionsSortBy,
  type CollectionsTypeFilter,
} from "@/components/collections/collections-toolbar";
import { LinkPagination } from "@/components/links/link-pagination";
import { CollectionsTree } from "@/components/collections/collections-tree";
import { CollectionsCanvas } from "@/components/collections/collections-canvas";
import {
  FolderOpen,
  Trash2,
  Pencil,
  FolderPlus,
  Link as LinkIcon,
  ArrowLeft,
  ExternalLink,
  FolderMinus,
  Globe,
  Target,
  LayoutGrid,
  Network,
  ListTree,
  Maximize2,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Local draft state for the click-goal editor — saving on every keystroke
// triggers a toast + event-bus refetch that overwrites the in-progress
// input value, causing visual glitches. We hold a draft, show a Save
// button when it differs from the persisted value, and confirm before
// applying the update.
function CollectionGoalEditor({
  collectionId,
  serverGoal,
  serverPeriod,
  onSave,
}: {
  collectionId: string;
  serverGoal: number | null;
  serverPeriod: string | null;
  onSave: (goal: number | null, period: string | null) => Promise<void>;
}) {
  const [draftGoal, setDraftGoal] = useState<string>(serverGoal != null ? String(serverGoal) : "");
  const [draftPeriod, setDraftPeriod] = useState<string>(serverPeriod || "daily");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-sync draft when the active collection or server values change
  // (e.g. user switches collections, or another tab updates the goal).
  useEffect(() => {
    setDraftGoal(serverGoal != null ? String(serverGoal) : "");
    setDraftPeriod(serverPeriod || "daily");
  }, [collectionId, serverGoal, serverPeriod]);

  const parsedDraftGoal = draftGoal.trim() === "" ? null : parseInt(draftGoal, 10);
  const isDirty =
    (parsedDraftGoal ?? null) !== (serverGoal ?? null) ||
    draftPeriod !== (serverPeriod || "daily");

  const handleConfirmSave = async () => {
    if (parsedDraftGoal !== null && (Number.isNaN(parsedDraftGoal) || parsedDraftGoal < 0)) {
      toast.error("Enter a valid positive number");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsedDraftGoal, parsedDraftGoal === null ? null : draftPeriod);
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await onSave(null, null);
      setDraftGoal("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={0}
          placeholder="Target clicks"
          value={draftGoal}
          onChange={(e) => setDraftGoal(e.target.value)}
          className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50"
        />
        <select
          value={draftPeriod}
          onChange={(e) => setDraftPeriod(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-[#00D26A]/50 [&>option]:bg-black"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        {isDirty && (
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={saving}
            className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-[10px] tracking-widest rounded-lg h-9 px-4"
          >
            Save Goal
          </Button>
        )}
        {serverGoal != null && serverGoal > 0 && !isDirty && (
          <button
            onClick={handleRemove}
            disabled={saving}
            className="text-xs font-bold text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            Remove goal
          </button>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !saving && setConfirmOpen(o)}>
        <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-100">
          <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
            Save Goal Update?
          </DialogTitle>
          <DialogDescription className="text-neutral-400 font-medium">
            New goal: <span className="text-[#00D26A] font-bold">
              {parsedDraftGoal ?? 0} clicks {draftPeriod}
            </span>. This replaces the current goal for this collection.
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
              className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={saving}
              className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-[10px] tracking-widest rounded-lg"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ViewMode = "grid" | "tree" | "canvas";

export default function CollectionsPage() {
  const { collections, loading, deleteCollection, updateCollection, reparentCollection, saveCollectionPosition, moveLinksToCollection } =
    useCollections();
  const { links } = useLinks();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );

  // Controlled "New sub-folder" dialog: when the tree row's + button or
  // a canvas-context creator fires, we open the dialog with the parent
  // pre-selected.
  const [subFolderParentId, setSubFolderParentId] = useState<string | null>(null);
  const [subFolderOpen, setSubFolderOpen] = useState(false);
  const openCreateSubFolder = (parentId: string) => {
    setSubFolderParentId(parentId);
    setSubFolderOpen(true);
  };

  // View mode: grid (default), tree (folder-in-folder), canvas (Miro).
  // Persisted in localStorage so the user lands in their preferred view
  // on next visit.
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  // Canvas fullscreen overlay — covers the entire viewport so the user
  // can see the whole graph at once, with a top bar + exit button.
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("tappr_collections_view") : null;
    if (stored === "grid" || stored === "tree" || stored === "canvas") setViewMode(stored);
  }, []);
  const changeViewMode = (m: ViewMode) => {
    setViewMode(m);
    try { localStorage.setItem("tappr_collections_view", m); } catch {}
  };

  // Escape closes the fullscreen overlay — standard pattern users expect.
  useEffect(() => {
    if (!canvasFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setCanvasFullscreen(false); };
    window.addEventListener("keydown", handler);
    // Lock body scroll while the overlay is up.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [canvasFullscreen]);

  // Toolbar state — mirrors the pattern from /dashboard/links so the
  // pages feel consistent.
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<CollectionsSortBy>("newest");
  const [typeFilter, setTypeFilter] = useState<CollectionsTypeFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const filteredCollections = useMemo(() => {
    let result = collections;

    if (typeFilter === "rotator") {
      result = result.filter((c) => c.is_rotator);
    } else if (typeFilter === "regular") {
      result = result.filter((c) => !c.is_rotator);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
        case "most-links":
          return (b.link_count || 0) - (a.link_count || 0);
        case "fewest-links":
          return (a.link_count || 0) - (b.link_count || 0);
        case "alpha":
          return a.name.localeCompare(b.name);
        case "newest":
        default:
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
    });

    return result;
  }, [collections, searchQuery, sortBy, typeFilter]);

  // Reset to page 1 when filters or page size change — keeps the user
  // off empty pages after narrowing the result set.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy, typeFilter, pageSize]);

  const pagedCollections = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCollections.slice(start, start + pageSize);
  }, [filteredCollections, page, pageSize]);

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

          <div className="flex items-center justify-between gap-4 flex-wrap">
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
            <AddLinkToCollectionDialog
              collectionId={activeCollection.id}
              collectionName={activeCollection.name}
            />
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
              <CollectionGoalEditor
                collectionId={activeCollection.id}
                serverGoal={activeCollection.click_goal}
                serverPeriod={activeCollection.click_goal_period}
                onSave={(goal, period) =>
                  updateCollection(activeCollection.id, {
                    click_goal: goal,
                    click_goal_period: period,
                  })
                }
              />
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
                  Use the <span className="text-[#00D26A] font-bold">Add Link</span> button above to add an existing link or create a new one.
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
          <div className="lg:col-span-2 space-y-4">
            <CollectionsToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              totalCount={filteredCollections.length}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />

            {/* View mode toggle — grid / tree / canvas. Stored in
                localStorage so the user lands on their preferred view. */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 w-fit">
                {([
                  { mode: "grid",   label: "Grid",   Icon: LayoutGrid },
                  { mode: "tree",   label: "Tree",   Icon: ListTree },
                  { mode: "canvas", label: "Canvas", Icon: Network },
                ] as const).map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => changeViewMode(mode)}
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      viewMode === mode
                        ? "bg-[#00D26A]/10 text-[#00D26A]"
                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              {viewMode === "canvas" && (
                <button
                  type="button"
                  onClick={() => setCanvasFullscreen(true)}
                  className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-[#00D26A]/30 bg-[#00D26A]/5 text-[#00D26A] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 transition-all"
                  title="Open canvas in fullscreen (Esc to exit)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fullscreen
                </button>
              )}
            </div>

            {filteredCollections.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-white/5">
                <p className="text-sm font-bold text-neutral-500">No collections match your filters</p>
              </div>
            ) : viewMode === "tree" ? (
              <CollectionsTree
                collections={filteredCollections}
                onOpen={setActiveCollectionId}
                onEdit={setEditId}
                onDelete={setDeleteId}
                onReparent={reparentCollection}
                onCreateChild={openCreateSubFolder}
              />
            ) : viewMode === "canvas" ? (
              <CollectionsCanvas
                collections={filteredCollections}
                onOpen={setActiveCollectionId}
                onMoveNode={saveCollectionPosition}
                onReparent={reparentCollection}
                onCreateChild={openCreateSubFolder}
              />
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {pagedCollections.map((col) => (
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateSubFolder(col.id);
                        }}
                        className="h-8 w-8 text-neutral-600 hover:text-[#00D26A]"
                        title="Create sub-folder here"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditId(col.id);
                        }}
                        className="h-8 w-8 text-neutral-600 hover:text-[#00D26A]"
                        title="Edit collection"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(col.id);
                        }}
                        className="h-8 w-8 text-neutral-600 hover:text-red-500"
                        title="Delete collection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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

              <LinkPagination
                page={page}
                pageSize={pageSize}
                total={filteredCollections.length}
                onPageChange={setPage}
              />
              </>
            )}
          </div>
          <div className="lg:col-span-1">
            <CollectionsInfo />
          </div>
          </div>
        )}
      </div>

      {/* Canvas fullscreen overlay — covers the entire viewport. Esc or
          the Exit button closes it. Body scroll is locked while open
          (see the useEffect above). */}
      {canvasFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-black/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <Network className="w-4 h-4 text-[#00D26A]" />
              <span className="text-sm font-black uppercase tracking-widest text-white">Canvas</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {filteredCollections.length} collection{filteredCollections.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCanvasFullscreen(false)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:border-white/20 transition-all"
              title="Exit fullscreen (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              Exit Canvas
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <CollectionsCanvas
              collections={filteredCollections}
              onOpen={(id) => { setCanvasFullscreen(false); setActiveCollectionId(id); }}
              onMoveNode={saveCollectionPosition}
              onReparent={reparentCollection}
              onCreateChild={openCreateSubFolder}
              fullHeight
            />
          </div>
        </div>
      )}

      {/* Edit collection */}
      <EditCollectionDialog
        collection={collections.find((c) => c.id === editId) || null}
        open={!!editId}
        onOpenChange={(o) => { if (!o) setEditId(null); }}
      />

      {/* Controlled "New sub-folder" dialog launched by the + buttons in
          the tree/canvas. Reuses CreateCollectionDialog in triggerless
          mode so the form, validation, and submit path stay shared. */}
      <CreateCollectionDialog
        open={subFolderOpen}
        onOpenChange={(o) => { setSubFolderOpen(o); if (!o) setSubFolderParentId(null); }}
        defaultParentId={subFolderParentId}
        triggerless
      />

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
