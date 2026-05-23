"use client";

import {
  Search,
  X,
  ArrowDownAZ,
  FolderOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Same visual language as LinkToolbar — always-visible filters, per-page
// chips inline, sharp single-row toolbar. Sort/filter set is tailored
// to collections (no clicks/status etc.).

export type CollectionsSortBy =
  | "newest"
  | "oldest"
  | "most-links"
  | "fewest-links"
  | "alpha";

export type CollectionsTypeFilter = "all" | "rotator" | "regular";

interface CollectionsToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: CollectionsSortBy;
  onSortByChange: (s: CollectionsSortBy) => void;
  typeFilter: CollectionsTypeFilter;
  onTypeFilterChange: (f: CollectionsTypeFilter) => void;
  totalCount: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

export function CollectionsToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  typeFilter,
  onTypeFilterChange,
  totalCount,
  pageSize,
  onPageSizeChange,
}: CollectionsToolbarProps) {
  const hasActiveFilters =
    sortBy !== "newest" ||
    typeFilter !== "all" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    onSortByChange("newest");
    onTypeFilterChange("all");
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-neutral-400" />
          Your Collections
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {totalCount} collection{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters row */}
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
              placeholder="Name or description…"
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
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <ArrowDownAZ className="w-3 h-3" /> Sort
          </Label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as CollectionsSortBy)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
          >
            <option value="newest" className="bg-neutral-900">Newest</option>
            <option value="oldest" className="bg-neutral-900">Oldest</option>
            <option value="most-links" className="bg-neutral-900">Most links</option>
            <option value="fewest-links" className="bg-neutral-900">Fewest links</option>
            <option value="alpha" className="bg-neutral-900">Alphabetical</option>
          </select>
        </div>

        {/* Type */}
        <div className="space-y-1.5 min-w-[130px]">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <FolderOpen className="w-3 h-3" /> Type
          </Label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as CollectionsTypeFilter)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-neutral-900">All</option>
            <option value="rotator" className="bg-neutral-900">Rotator only</option>
            <option value="regular" className="bg-neutral-900">Non-rotator</option>
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
