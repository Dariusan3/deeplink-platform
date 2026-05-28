"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { QrCodeCard } from "@/components/qr/qr-code-card";
import {
  QrToolbar,
  type QrStatusFilter,
  type QrSortBy,
} from "@/components/qr/qr-toolbar";
import { LinkPagination } from "@/components/links/link-pagination";
import { Card } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function QrCodesPage() {
  const { links, loading } = useLinks();
  const { collections } = useCollections();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QrStatusFilter>("all");
  const [sortBy, setSortBy] = useState<QrSortBy>("newest");
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const filteredLinks = useMemo(() => {
    let result = links;

    if (statusFilter === "active") {
      result = result.filter((l) => l.is_active);
    } else if (statusFilter === "paused") {
      result = result.filter((l) => !l.is_active);
    }

    if (collectionFilter) {
      result = result.filter((l) => l.collection_id === collectionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.slug.toLowerCase().includes(q) ||
          l.destination_url.toLowerCase().includes(q)
      );
    }

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
  }, [links, searchQuery, statusFilter, sortBy, collectionFilter]);

  // Snap back to page 1 whenever filters change — otherwise narrowing can
  // leave the user on an empty page.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortBy, collectionFilter, pageSize]);

  const pagedLinks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLinks.slice(start, start + pageSize);
  }, [filteredLinks, page, pageSize]);

  return (
    <>
      <Header title="QR Codes" />
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            QR Codes
          </h2>
          <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
            Generate & Download QR Codes for Your Links
          </p>
        </div>

        {loading && links.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card bg-white/[0.01] border-white/5 p-6 rounded-[32px] h-[280px]">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-[180px] w-[180px] rounded-xl" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          <Card className="glass-card bg-white/[0.01] border-white/5 border-dashed relative overflow-hidden">
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,210,106,0.05)] border border-[#00D26A]/10">
                <QrCode className="w-10 h-10 text-[#00D26A]/40" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">No Links Yet</h3>
              <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                Create your first link to generate QR codes.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <QrToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              collectionFilter={collectionFilter}
              onCollectionFilterChange={setCollectionFilter}
              totalCount={filteredLinks.length}
              collections={collections.map((c) => ({ id: c.id, name: c.name }))}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />

            {filteredLinks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm font-bold text-neutral-500">No links match your filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {pagedLinks.map((link) => (
                    <QrCodeCard key={link.id} link={link} />
                  ))}
                </div>

                <div className="pb-20">
                  <LinkPagination
                    page={page}
                    pageSize={pageSize}
                    total={filteredLinks.length}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
