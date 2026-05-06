"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { useLinks } from "@/hooks/use-links";
import { QrCodeCard } from "@/components/qr/qr-code-card";
import { LinkPagination } from "@/components/links/link-pagination";
import { Card } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function QrCodesPage() {
  const { links, loading } = useLinks();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const pagedLinks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return links.slice(start, start + pageSize);
  }, [links, page, pageSize]);

  // Snap back to page 1 when page size changes — otherwise switching from
  // 12 to 96 per page can leave you on an empty page.
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  return (
    <>
      <Header title="QR Codes" />
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {pagedLinks.map((link) => (
                <QrCodeCard key={link.id} link={link} />
              ))}
            </div>

            <div className="pb-20">
              <LinkPagination
                page={page}
                pageSize={pageSize}
                total={links.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
