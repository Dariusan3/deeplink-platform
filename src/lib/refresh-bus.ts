// Tiny in-process event bus so a hook instance in a dialog can notify
// another hook instance in a list — without depending on Supabase Realtime
// publication being configured.
//
// Two modes:
//
// 1. Plain notify (no payload). Subscribers re-fetch the list. Used by
//    bulk operations, delete with no row, or any case where we don't have
//    the new data in memory.
//      emit("links");
//      subscribe("links", () => fetchLinks());
//
// 2. With a typed payload. The bus carries the row (or id) so subscribers
//    can apply the change optimistically without a server round-trip —
//    new items appear instantly after the dialog closes.
//      emit("links", { kind: "create", row });
//      subscribe("links", (event) => {
//        if (event?.kind === "create") setLinks((prev) => [event.row, ...prev]);
//      });
//
// Fires only on explicit user actions, never on a timer or focus event.

type Resource =
  | "links"
  | "collections"
  | "api-keys"
  | "brain-chats"
  | "business-brain"
  | "ab-tests"
  | "teams"
  | "partner-data";

export type ResourceEvent<T = unknown> =
  | { kind: "create"; row: T }
  | { kind: "update"; row: T }
  | { kind: "delete"; id: string }
  | { kind: "refetch" };

type Listener = (event?: ResourceEvent) => void;

const listeners = new Map<Resource, Set<Listener>>();

export function emit(resource: Resource, event?: ResourceEvent): void {
  const set = listeners.get(resource);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(event);
    } catch (err) {
      console.error(`refresh-bus listener for ${resource} threw:`, err);
    }
  }
}

export function subscribe(resource: Resource, fn: Listener): () => void {
  let set = listeners.get(resource);
  if (!set) {
    set = new Set();
    listeners.set(resource, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
}
