// Root not-found boundary: any unmatched APP route (e.g. a mistyped
// /dashbaord) renders the branded 404 instead of Next.js's default page.
// Reuses the same component the short-link resolver redirects dead slugs to.
import NotFound from "./not-found/page";

export default function RootNotFound() {
  return <NotFound />;
}
