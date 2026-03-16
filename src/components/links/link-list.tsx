"use client";

import { useEffect } from "react";
import { useLinks } from "@/hooks/use-links";
import { LinkCard } from "./link-card";
import { Card } from "@/components/ui/card";
import { Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function LinkList() {
  const { links, loading, fetchLinks, updateLink, deleteLink, resetClicks } = useLinks();

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

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
            your first intelligent deeplink.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 pb-20 mt-8">
      {links.map((link) => (
        <LinkCard
          key={link.id}
          link={link}
          onToggleActive={(id, active) => updateLink(id, { is_active: active })}
          onDelete={(id) => deleteLink(id)}
          onResetClicks={(id) => resetClicks(id)}
        />
      ))}
    </div>
  );
}
