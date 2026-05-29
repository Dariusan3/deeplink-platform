// `useLinks` is now backed by a single shared LinksProvider (see
// src/providers/links-provider.tsx) so all consumers share one fetch and one
// realtime channel instead of each firing its own. Re-exported here to keep
// the existing "@/hooks/use-links" import path stable across call sites.
export { useLinks, LinksProvider } from "@/providers/links-provider";
