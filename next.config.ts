import type { NextConfig } from "next";
import path from "node:path";

// Lock Turbopack's workspace root to THIS project. Without this, Next 16
// walks up the tree looking for the nearest lockfile and incorrectly
// picks /Users/osadicidarius/Documents/projects/ because there's another
// project (LansorWebAgency) with its own package-lock.json living next to
// us. That mis-roots module resolution and tailwindcss can no longer be
// found from node_modules.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  experimental: {
    // The dashboard tree is `force-dynamic`, and Next's default client router
    // cache staleTime for dynamic segments is 0 — so navigating back to a page
    // you were just on refetched its whole RSC payload from the server. 30s of
    // reuse makes returning to an already-visited sidebar page instant. Fresh
    // data still arrives: the providers revalidate in the background, and any
    // router.refresh() / revalidatePath() call busts this cache immediately.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
