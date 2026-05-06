"use client";

import { useState, useMemo, useEffect } from "react";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { LinkCard } from "./link-card";
import { LinkToolbar, StatusFilter, SortBy } from "./link-toolbar";
import { LinkPagination } from "./link-pagination";
import { Card } from "@/components/ui/card";
import { Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function LinkList() {
  const { links, loading, updateLink, deleteLink, toggleFavorite } = useLinks();
  const { collections, moveLinksToCollection } = useCollections();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const filteredLinks = useMemo(() => {
    let result = links;

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((l) => l.is_active);
    } else if (statusFilter === "paused") {
      result = result.filter((l) => !l.is_active);
    }

    // Collection filter
    if (collectionFilter) {
      result = result.filter((l) => l.collection_id === collectionFilter);
    }

    // Date filter (older than)
    if (dateFilter) {
      const cutoff = new Date(dateFilter);
      result = result.filter((l) => new Date(l.created_at) < cutoff);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.slug.toLowerCase().includes(q) ||
          l.destination_url.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "most-clicks":
          return (b.click_count || 0) - (a.click_count || 0);
        case "least-clicks":
          return (a.click_count || 0) - (b.click_count || 0);
        case "alpha":
          return (a.title || a.slug).localeCompare(b.title || b.slug);
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [links, searchQuery, statusFilter, sortBy, collectionFilter, dateFilter]);

  // Reset to first page whenever the filter set or page size changes —
  // otherwise users land on an empty page after narrowing results.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortBy, collectionFilter, dateFilter, pageSize]);

  const pagedLinks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLinks.slice(start, start + pageSize);
  }, [filteredLinks, page, pageSize]);

  const allSelected = pagedLinks.length > 0 && pagedLinks.every((l) => selectedIds.has(l.id));

  const handleSelectAll = () => {
    // Selects only the rows visible on the current page — matches
    // user expectation when paginating.
    setSelectedIds(new Set(pagedLinks.map((l) => l.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await deleteLink(id);
    }
    setSelectedIds(new Set());
    toast.success(`${count} link${count !== 1 ? "s" : ""} deleted`);
  };

  const handleBulkPause = async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await updateLink(id, { is_active: false });
    }
    setSelectedIds(new Set());
    toast.success(`${count} link${count !== 1 ? "s" : ""} paused`);
  };

  const handleBulkCollection = async (collectionId: string | null) => {
    const ids = Array.from(selectedIds);
    await moveLinksToCollection(ids, collectionId);
    setSelectedIds(new Set());
    toast.success(`${ids.length} link${ids.length !== 1 ? "s" : ""} moved to collection`);
  };

  if (loading && links.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 pb-20 mt-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card bg-white/[0.01] border-white/5 p-6 rounded-[32px] overflow-hidden relative h-[180px]">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-6 w-1/3 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-3 w-1/4 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <Card className="glass-card bg-white/[0.01] border-white/5 border-dashed relative overflow-hidden mt-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,210,106,0.05)] border border-[#00D26A]/10">
            <LinkIcon className="w-10 h-10 text-[#00D26A]/40" />
          </div>
          <h3 className="text-lg font-black text-white mb-2">No High-Performance Links</h3>
          <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed mb-8">
            Start your optimized distribution journey by creating <br />
            your first intelligent link.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      <LinkToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        collectionFilter={collectionFilter}
        onCollectionFilterChange={setCollectionFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        selectedCount={selectedIds.size}
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkDelete={handleBulkDelete}
        onBulkPause={handleBulkPause}
        onBulkCollection={handleBulkCollection}
        totalCount={filteredLinks.length}
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
      />

      {filteredLinks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-bold text-neutral-500">No links match your filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
            {pagedLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                onToggleActive={(id, active) => updateLink(id, { is_active: active })}
                onDelete={(id) => deleteLink(id)}
                onToggleFavorite={(id, favorite) => toggleFavorite(id, favorite)}
                selected={selectedIds.has(link.id)}
                onToggleSelect={() => handleToggleSelect(link.id)}
                collections={collections.map((c) => ({ id: c.id, name: c.name }))}
              />
            ))}
          </div>

          <div className="pb-20">
            <LinkPagination
              page={page}
              pageSize={pageSize}
              total={filteredLinks.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}
    </div>
  );
}
