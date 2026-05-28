"use client";

import { useState } from "react";
import {
  Search,
  Trash2,
  Pause,
  CheckSquare,
  Square,
  FolderOpen,
  X,
  ArrowDownAZ,
  Calendar,
  Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type StatusFilter = "all" | "active" | "paused";
export type SortBy = "newest" | "oldest" | "most-clicks" | "least-clicks" | "alpha";

interface CollectionOption {
  id: string;
  name: string;
}

interface LinkToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
  collectionFilter: string | null;
  onCollectionFilterChange: (id: string | null) => void;
  dateFilter: string;
  onDateFilterChange: (date: string) => void;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkPause: () => void;
  onBulkCollection: (collectionId: string | null) => void;
  totalCount: number;
  collections: CollectionOption[];
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

export function LinkToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  collectionFilter,
  onCollectionFilterChange,
  dateFilter,
  onDateFilterChange,
  selectedCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkPause,
  onBulkCollection,
  totalCount,
  collections,
  pageSize,
  onPageSizeChange,
}: LinkToolbarProps) {
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);

  const hasActiveFilters =
    statusFilter !== "all" ||
    collectionFilter !== null ||
    dateFilter !== "" ||
    sortBy !== "newest" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    onStatusFilterChange("all");
    onSortByChange("newest");
    onCollectionFilterChange(null);
    onDateFilterChange("");
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      {/* Title + bulk actions row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            Your Links
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {totalCount} link{totalCount !== 1 ? "s" : ""}
          </span>
          {selectedCount > 0 && (
            <>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                {selectedCount} selected
              </span>
              <button
                onClick={onDeselectAll}
                className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Bulk action icons — user explicitly asked to keep these unchanged */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
          <button
            onClick={selectedCount > 0 && allSelected ? onDeselectAll : onSelectAll}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
            title={selectedCount > 0 && allSelected ? "Deselect all" : "Select all on this page"}
          >
            {selectedCount > 0 && allSelected
              ? <CheckSquare className="w-4 h-4 text-[#00D26A]" />
              : <Square className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowCollectionDialog(true)}
            disabled={selectedCount === 0}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
              selectedCount === 0
                ? "text-neutral-600 opacity-40 cursor-not-allowed"
                : "text-neutral-400 hover:text-[#00D26A] hover:bg-[#00D26A]/10"
            )}
            title={selectedCount === 0 ? "Select links first" : "Add to collection"}
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPauseDialog(true)}
            disabled={selectedCount === 0}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
              selectedCount === 0
                ? "text-neutral-600 opacity-40 cursor-not-allowed"
                : "text-neutral-400 hover:text-amber-400 hover:bg-amber-500/10"
            )}
            title={selectedCount === 0 ? "Select links first" : "Pause selected"}
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={selectedCount === 0}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
              selectedCount === 0
                ? "text-neutral-600 opacity-40 cursor-not-allowed"
                : "text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
            )}
            title={selectedCount === 0 ? "Select links first" : "Delete selected"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters row — always visible. Search left, filter selects right. */}
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
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
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
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
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

        {/* Older than */}
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Older than
          </Label>
          <DatePicker
            value={dateFilter}
            onChange={onDateFilterChange}
            placeholder="Pick a date"
          />
        </div>

        {/* Per page — sits up here per request, not at the bottom */}
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

      {/* Pause Confirmation Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="glass-card bg-black/95 border-white/5 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Pause className="w-5 h-5 text-amber-400" />
              Pause Links
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-400 py-2">
            Are you sure you want to pause <span className="text-white font-bold">{selectedCount} link{selectedCount !== 1 ? "s" : ""}</span>? Paused links will stop redirecting visitors until reactivated.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowPauseDialog(false)} className="font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => { onBulkPause(); setShowPauseDialog(false); }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-black"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause {selectedCount} Link{selectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="glass-card bg-black/95 border-white/5 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Links
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-400 py-2">
            Are you sure you want to permanently delete <span className="text-red-400 font-bold">{selectedCount} link{selectedCount !== 1 ? "s" : ""}</span>? This will remove all associated analytics data. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => { onBulkDelete(); setShowDeleteDialog(false); }}
              className="bg-red-500 hover:bg-red-600 text-white font-black"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedCount} Link{selectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent className="glass-card bg-black/95 border-white/5 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#00D26A]" />
              Add to Collection
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-xs text-neutral-400">
              Move <span className="text-white font-bold">{selectedCount} link{selectedCount !== 1 ? "s" : ""}</span> to a collection
            </p>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
            >
              <option value="" className="bg-neutral-900">Select Collection to Add</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id} className="bg-neutral-900">{col.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowCollectionDialog(false)} className="font-bold">
              Cancel
            </Button>
            <Button
              disabled={!selectedCollectionId}
              onClick={() => {
                onBulkCollection(selectedCollectionId);
                setShowCollectionDialog(false);
                setSelectedCollectionId("");
              }}
              className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
