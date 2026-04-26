// Tiny in-process event bus so a hook instance in a dialog can notify
// another hook instance in a list to refetch — without depending on
// Supabase Realtime publication being configured.
//
// Pattern: the mutation method (createLink, deleteCollection, etc.) calls
// `emit("links")` after a successful write. Every useLinks() instance
// subscribes via `subscribe("links", fetchLinks)` and refetches when notified.
//
// Fires only on explicit user actions, never on a timer or focus event —
// safe to attach without producing surprise refreshes.

type Resource =
  | "links"
  | "collections"
  | "api-keys"
  | "brain-chats"
  | "business-brain"
  | "ab-tests"
  | "teams"
  | "partner-data";

type Listener = () => void;

const listeners = new Map<Resource, Set<Listener>>();

export function emit(resource: Resource): void {
  const set = listeners.get(resource);
  if (!set) return;
  for (const fn of set) {
    try {
      fn();
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
