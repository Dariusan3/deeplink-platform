"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  // When omitted, the per-page selector is hidden (it lives in LinkToolbar
  // on the links page now). QR codes page still passes this since it has
  // no toolbar.
  onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

// Build a compact page list with ellipses, e.g.:
//   1, 2, 3, 4, 5            (≤ 7 pages)
//   1, 2, 3, 4, 5, …, 24     (current near start)
//   1, …, 11, 12, 13, …, 24  (current in middle)
//   1, …, 20, 21, 22, 23, 24 (current near end)
function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", total];
  }
  if (current >= total - 3) {
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

// Bottom-of-page nav. The per-page selector lives in LinkToolbar now.
export function LinkPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: LinkPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const pages = buildPageList(safePage, totalPages);
  const goto = (p: number) => onPageChange(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="glass-card bg-white/[0.01] border-white/5 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Range + (optional) per-page selector */}
      <div className="flex items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
          <span className="text-white">{start}</span>
          <span className="text-neutral-600">–</span>
          <span className="text-white">{end}</span>
          <span className="text-neutral-600 mx-1.5">/</span>
          <span className="text-[#00D26A]">{total}</span>
          <span className="ml-2 text-neutral-500">links</span>
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-4 border-l border-white/5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
              Per page
            </span>
            <div className="flex items-center gap-0.5">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onPageSizeChange(size)}
                  className={cn(
                    "h-6 min-w-7 px-1.5 text-[11px] font-black tabular-nums rounded-md transition-colors",
                    size === pageSize
                      ? "bg-[#00D26A]/15 text-[#00D26A] border border-[#00D26A]/30"
                      : "text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Page nav — hidden when there's only one page */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goto(1)}
            disabled={safePage === 1}
            aria-label="First page"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goto(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Previous page"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-0.5 px-1">
            {pages.map((p, i) =>
              p === "ellipsis" ? (
                <span
                  key={`e-${i}`}
                  className="h-8 w-6 flex items-center justify-center text-neutral-600 text-xs"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goto(p)}
                  aria-current={p === safePage ? "page" : undefined}
                  className={cn(
                    "h-8 min-w-8 px-2 text-[12px] font-black tabular-nums rounded-lg transition-all",
                    p === safePage
                      ? "bg-[#00D26A] text-black shadow-[0_0_20px_rgba(0,210,106,0.35)]"
                      : "text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => goto(safePage + 1)}
            disabled={safePage === totalPages}
            aria-label="Next page"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goto(totalPages)}
            disabled={safePage === totalPages}
            aria-label="Last page"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
