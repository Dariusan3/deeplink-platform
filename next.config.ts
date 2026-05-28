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
};

export default nextConfig;
