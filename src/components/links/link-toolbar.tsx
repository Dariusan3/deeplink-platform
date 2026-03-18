"use client";

import { useState } from "react";
import { Search, Filter, Trash2, Archive, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type StatusFilter = "all" | "active" | "paused";

interface LinkToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkArchive: () => void;
  totalCount: number;
}

export function LinkToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkArchive,
  totalCount,
}: LinkToolbarProps) {
  const filterLabels: Record<StatusFilter, string> = {
    all: "All",
    active: "Active",
    paused: "Paused",
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Select all checkbox */}
      <button
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="shrink-0 w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all"
        title={allSelected ? "Deselect all" : "Select all"}
      >
        {allSelected ? (
          <CheckSquare className="w-4 h-4 text-[#00D26A]" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <Input
          placeholder="Search links..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-lg text-sm"
        />
      </div>

      {/* Status filter */}
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton={true}
          render={
            <Button
              variant="outline"
              className="h-9 rounded-lg border-white/5 bg-white/[0.03] text-xs font-bold gap-2 hover:bg-white/[0.06] text-neutral-300"
            >
              <Filter className="w-3.5 h-3.5" />
              {filterLabels[statusFilter]}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="glass-card bg-black/90 border-white/10">
          {(["all", "active", "paused"] as StatusFilter[]).map((f) => (
            <DropdownMenuItem
              key={f}
              className="text-xs font-bold gap-2 focus:bg-[#00D26A]/10 focus:text-[#00D26A]"
              onClick={() => onStatusFilterChange(f)}
            >
              {filterLabels[f]}
              {f === statusFilter && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bulk actions (visible when items selected) */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {selectedCount} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkArchive}
            className="h-8 rounded-lg border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/20 transition-all gap-1.5"
          >
            <Archive className="w-3 h-3" />
            Pause
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="h-8 rounded-lg border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all gap-1.5"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
