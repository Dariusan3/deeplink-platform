import { Skeleton } from "@/components/ui/skeleton";

// Suspense boundary for /dashboard and every route nested under it.
//
// Two jobs, both about navigation feel:
//  1. The dashboard tree is `force-dynamic` (see ../layout.tsx), and Next only
//     prefetches a dynamic route down to its nearest loading boundary. Without
//     this file nothing was prefetchable, so the sidebar's hover prefetch was a
//     no-op and every click blocked on a full server round-trip.
//  2. It gives that round-trip somewhere to land: the shell paints instantly
//     instead of the old page freezing until the new RSC payload arrives.
//
// Mirrors the shape every dashboard page shares — <Header /> bar, title block,
// content grid — so the swap to real content doesn't shift layout.
export default function DashboardLoading() {
  return (
    <>
      <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4 px-4 md:px-6 h-16">
          <Skeleton className="h-6 w-40" />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </>
  );
}
