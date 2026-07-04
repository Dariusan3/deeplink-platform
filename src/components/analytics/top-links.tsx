"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopLinkData } from "@/hooks/use-analytics";

interface TopLinksProps {
  data: TopLinkData[];
}

export function TopLinks({ data }: TopLinksProps) {
  const router = useRouter();
  const maxCount = data.length > 0 ? data[0].count : 1;

  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#00D26A]/20" />
      <CardHeader className="pt-6 px-6 pb-3">
        <CardTitle className="text-sm font-black flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-[#00D26A]" />
          Top Links
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {data.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-6">No data yet</p>
        ) : (
          <div className="space-y-2">
            {data.map((link, i) => (
              <button
                key={link.id || link.slug}
                type="button"
                onClick={() => link.id && router.push(`/dashboard/links/${link.id}`)}
                className="w-full flex items-center gap-3 text-left rounded-lg -mx-2 px-2 py-1.5 hover:bg-white/[0.03] transition-colors group"
                title="Open link"
              >
                <span className="text-[10px] font-black text-neutral-600 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white truncate group-hover:text-[#00D26A] transition-colors">
                      {link.title || `/${link.slug}`}
                    </span>
                    <span className="text-xs font-black text-[#00D26A] shrink-0 ml-2">{link.count}</span>
                  </div>
                  {/* Show the slug under the title so the identity is always clear */}
                  {link.title && (
                    <span className="text-[10px] text-neutral-500 truncate block mb-1">/{link.slug}</span>
                  )}
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00D26A]/60 transition-all"
                      style={{ width: `${(link.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
