"use client";

import {
  Search,
  X,
  ArrowDownAZ,
  Hash,
  FolderOpen,
  QrCode,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Same visual language as LinkToolbar — filters always visible, per-page
// chips inline, single toolbar row up top. QR page doesn't have bulk
// actions, so this is a slimmer version.

export type QrStatusFilter = "all" | "active" | "paused";
export type QrSortBy = "newest" | "oldest" | "most-clicks" | "least-clicks" | "alpha";

interface CollectionOption {
  id: string;
  name: string;
}

interface QrToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: QrStatusFilter;
  onStatusFilterChange: (f: QrStatusFilter) => void;
  sortBy: QrSortBy;
  onSortByChange: (s: QrSortBy) => void;
  collectionFilter: string | null;
  onCollectionFilterChange: (id: string | null) => void;
  totalCount: number;
  collections: CollectionOption[];
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

export function QrToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  collectionFilter,
  onCollectionFilterChange,
  totalCount,
  collections,
  pageSize,
  onPageSizeChange,
}: QrToolbarProps) {
  const hasActiveFilters =
    statusFilter !== "all" ||
    collectionFilter !== null ||
    sortBy !== "newest" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    onStatusFilterChange("all");
    onSortByChange("newest");
    onCollectionFilterChange(null);
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-neutral-400" />
            Your QR Codes
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {totalCount} link{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Filters row — always visible */}
      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <Search className="w-3 h-3" /> Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Title, path, or URL…"
              className="pl-9 pr-8 h-10 bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-lg text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <div className="space-y-1.5 min-w-[130px]">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <ArrowDownAZ className="w-3 h-3" /> Sort
          </Label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as QrSortBy)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
          >
            <option value="newest" className="bg-neutral-900">Newest</option>
            <option value="oldest" className="bg-neutral-900">Oldest</option>
            <option value="most-clicks" className="bg-neutral-900">Most clicks</option>
            <option value="least-clicks" className="bg-neutral-900">Least clicks</option>
            <option value="alpha" className="bg-neutral-900">Alphabetical</option>
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1.5 min-w-[110px]">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <Hash className="w-3 h-3" /> Status
          </Label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as QrStatusFilter)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-neutral-900">All</option>
            <option value="active" className="bg-neutral-900">Active</option>
            <option value="paused" className="bg-neutral-900">Paused</option>
          </select>
        </div>

        {/* Collection */}
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <FolderOpen className="w-3 h-3" /> Collection
          </Label>
          <select
            value={collectionFilter || ""}
            onChange={(e) => onCollectionFilterChange(e.target.value || null)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
          >
            <option value="" className="bg-neutral-900">All collections</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id} className="bg-neutral-900">{col.name}</option>
            ))}
          </select>
        </div>

        {/* Per page */}
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
            Per page
          </Label>
          <div className="flex items-center gap-0.5 h-10 px-1 rounded-lg bg-white/[0.03] border border-white/10">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onPageSizeChange(size)}
                className={cn(
                  "h-7 min-w-9 px-2 text-[11px] font-black tabular-nums rounded-md transition-colors",
                  size === pageSize
                    ? "bg-[#00D26A]/15 text-[#00D26A]"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white gap-1.5 self-end"
          >
            <X className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
