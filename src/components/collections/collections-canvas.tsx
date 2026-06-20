"use client";

import { useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
  useNodesState,
  useEdgesState,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { FolderOpen, Link2, FolderPlus, ExternalLink, Sparkles, LinkIcon } from "lucide-react";
import { Collection } from "@/hooks/use-collections";
import type { Link as LinkType } from "@/types/links";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Miro-style canvas for collections. Folders are nodes; parent_id forms
// the edges. First mount runs a dagre top-down auto-layout for any
// collection that hasn't been positioned manually. Drag a node to move
// it — position_x/y is persisted via saveCollectionPosition.

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;
const LINK_NODE_WIDTH = 200;
const LINK_NODE_HEIGHT = 70;

interface CollectionNodeData {
  collection: Collection;
  onOpen: (id: string) => void;
  onCreateChild?: (parentId: string) => void;
  onCreateLink?: (collectionId: string) => void;
  [key: string]: unknown;
}

// Custom node — keeps the visual style consistent with the rest of the
// dashboard (glass card + colour bar + folder icon + counts). The
// top/bottom Handle elements are how React Flow lets users drag a wire
// from one node to another — we use the gesture to reparent on
// drop (see `onConnect` in InnerCanvas).
function CollectionNode({ data, selected }: NodeProps<Node<CollectionNodeData>>) {
  const c = data.collection;
  const color = c.color || "#00D26A";
  return (
    <div
      className={cn(
        "rounded-2xl border bg-black/70 backdrop-blur-md p-3 transition-all cursor-pointer w-[200px] group relative",
        "hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,210,106,0.15)]",
        selected ? "border-[#00D26A] ring-2 ring-[#00D26A]/40" : "border-white/10 hover:border-white/20"
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      {/* Target handle on the LEFT — parent connects from its right side
          into this node's left. Mirrors n8n's horizontal flow. */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[#00D26A]/50 !border-2 !border-[#00D26A] !w-3 !h-3 hover:!bg-[#00D26A] transition-all"
      />

      <div className="flex items-center gap-2" onClick={() => data.onOpen(c.id)}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <FolderOpen className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white truncate">{c.name}</p>
          {c.description && (
            <p className="text-[10px] text-neutral-500 font-medium truncate">{c.description}</p>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-neutral-400">
        <Link2 className="w-3 h-3" />
        <span>{c.link_count || 0} link{(c.link_count || 0) !== 1 ? "s" : ""}</span>
        {c.is_rotator && (
          <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-amber-400">
            rotator
          </span>
        )}
      </div>

      {/* Quick action buttons: "+ Sub-folder" and "+ Link". Always
          visible (stacked in the top-right corner), each with an instant
          tooltip on hover. Both pre-select this collection so the user
          lands in the dialog with one click. */}
      {data.onCreateChild && (
        <div className="absolute -top-2 -right-2 group/act">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); data.onCreateChild!(c.id); }}
            aria-label="New sub-folder"
            className="w-6 h-6 rounded-lg bg-[#00D26A] text-black flex items-center justify-center transition-all shadow-[0_0_10px_rgba(0,210,106,0.4)] hover:scale-110"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
          <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2 py-1 rounded-md bg-black border border-white/10 text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover/act:opacity-100 transition-opacity z-30 shadow-lg">
            New sub-folder
          </span>
        </div>
      )}
      {data.onCreateLink && (
        <div className="absolute top-5 -right-2 group/act">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); data.onCreateLink!(c.id); }}
            aria-label="New link"
            className="w-6 h-6 rounded-lg bg-blue-400 text-black flex items-center justify-center transition-all shadow-[0_0_10px_rgba(96,165,250,0.4)] hover:scale-110"
          >
            <LinkIcon className="w-3 h-3" />
          </button>
          <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2 py-1 rounded-md bg-black border border-white/10 text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover/act:opacity-100 transition-opacity z-30 shadow-lg">
            New link
          </span>
        </div>
      )}

      {/* Source handle on the RIGHT — drag from here to another node's
          left side to set THAT node's parent to me. */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[#00D26A]/50 !border-2 !border-[#00D26A] !w-3 !h-3 hover:!bg-[#00D26A] transition-all"
      />
    </div>
  );
}

// ── Link node ────────────────────────────────────────────────────────
// Visual leaf inside a collection. Smaller than a collection node,
// destination-url + click count, and read-only — links aren't reparented
// here (use the links page for that). Only a target handle on the left
// because links never have children.
interface LinkNodeData {
  link: LinkType;
  onOpen: (linkId: string) => void;
  [key: string]: unknown;
}

function LinkNode({ data, selected }: NodeProps<Node<LinkNodeData>>) {
  const l = data.link;
  let host = "";
  try { host = new URL(l.destination_url).hostname.replace(/^www\./, ""); } catch {}
  return (
    <div
      onClick={() => data.onOpen(l.id)}
      className={cn(
        "rounded-xl border bg-black/60 backdrop-blur-md px-3 py-2 transition-all cursor-pointer w-[200px]",
        "hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,210,106,0.1)]",
        selected ? "border-[#00D26A] ring-2 ring-[#00D26A]/40" : "border-white/10 hover:border-white/20"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!bg-white/30 !border-none !w-1.5 !h-1.5"
      />
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{l.title || l.slug}</p>
          <p className="text-[10px] text-neutral-500 font-medium truncate">{host || l.destination_url}</p>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-neutral-500">
        <Link2 className="w-2.5 h-2.5" />
        <span>{l.click_count || 0} click{(l.click_count || 0) !== 1 ? "s" : ""}</span>
        {l.is_active === false && (
          <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-amber-400">
            paused
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { collection: CollectionNode, link: LinkNode };

// Dagre layout for COLLECTIONS only — produces fallback coords for any
// folder without a persisted position_x/y. Links are positioned inline
// next to their parent's effective position (see `initialNodes` below)
// because dagre doesn't know about saved positions and would otherwise
// drop link nodes far from their dragged folder.
//
// Ranksep is widened to leave room on the right of every folder for its
// link stack — links sit at folder.x + NODE_WIDTH + 60, so 280px of
// horizontal breathing room avoids collisions with the next rank.
function autoLayout(
  collections: Collection[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 320, marginx: 40, marginy: 40 });

  const collectionIds = new Set(collections.map((c) => c.id));
  for (const c of collections) {
    g.setNode(c.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const c of collections) {
    if (c.parent_id && collectionIds.has(c.parent_id)) {
      g.setEdge(c.parent_id, c.id);
    }
  }
  dagre.layout(g);

  const out = new Map<string, { x: number; y: number }>();
  for (const c of collections) {
    const n = g.node(c.id);
    if (n) out.set(c.id, { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 });
  }
  return out;
}

interface CollectionsCanvasProps {
  collections: Collection[];
  // Optional — when provided, links with a collection_id render as leaf
  // nodes connected to their parent collection. Omitting hides them and
  // shows only the folder hierarchy.
  links?: LinkType[];
  onOpen: (id: string) => void;
  onMoveNode: (id: string, x: number, y: number) => Promise<void> | void;
  onReparent: (childId: string, newParentId: string | null) => Promise<void> | void;
  onCreateChild?: (parentId: string) => void;
  // Fires when the user clicks the "+ Link" hover button on a collection
  // node. Caller opens CreateLinkDialog with collection_id pre-selected.
  onCreateLink?: (collectionId: string) => void;
  // Called when the user clicks a LINK node — drills into the link's
  // detail page. Defaults to onOpen if not provided.
  onOpenLink?: (linkId: string) => void;
  // When true, the React Flow surface stretches to fill its container
  // (height: 100%) instead of using the default 600px frame. Used by
  // the fullscreen overlay on the collections page.
  fullHeight?: boolean;
}

// Returns true if `descendantId` is already in the subtree rooted at
// `ancestorId`. Walks parents up from descendantId. Used to short-circuit
// cycle-creating connects before the DB trigger rejects them.
function wouldCreateCycle(
  ancestorId: string,
  descendantId: string,
  collections: Collection[]
): boolean {
  const seen = new Set<string>();
  let cursor: string | null = descendantId;
  while (cursor) {
    if (seen.has(cursor)) return false;
    seen.add(cursor);
    if (cursor === ancestorId) return true;
    const c: Collection | undefined = collections.find((x) => x.id === cursor);
    cursor = c?.parent_id ?? null;
  }
  return false;
}

function InnerCanvas({ collections, links = [], onOpen, onMoveNode, onReparent, onCreateChild, onCreateLink, onOpenLink, fullHeight }: CollectionsCanvasProps) {
  const { fitView } = useReactFlow();
  // Dagre fallback for collections that don't have persisted positions.
  // Doesn't depend on `links` — link nodes are placed inline next to
  // their parent so they don't influence folder layout.
  const fallback = useMemo(() => autoLayout(collections), [collections]);

  const handleOpenLink = useCallback((linkId: string) => {
    if (onOpenLink) onOpenLink(linkId);
    else onOpen(linkId);
  }, [onOpen, onOpenLink]);

  const initialNodes: Node[] = useMemo(() => {
    const out: Node[] = [];
    // Effective on-screen position per collection. Three sources, in
    // priority order:
    //  1. Persisted position_x/y on the row (user dragged it).
    //  2. Computed relative to parent's effective position — used when
    //     a brand-new sub-folder gets created under a folder you've
    //     already moved. dagre would otherwise drop it hundreds of px
    //     away from where you'd expect.
    //  3. Dagre fallback — for roots with no saved coords on first load.
    const collectionPositions = new Map<string, { x: number; y: number }>();

    // BFS from roots so a child is only placed once its parent has a
    // known position. Roots first, then their children, then grandchildren.
    const childrenByParent = new Map<string | null, Collection[]>();
    for (const c of collections) {
      const key = c.parent_id ?? null;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key)!.push(c);
    }
    // Stable visual ordering — siblings without saved positions stack
    // top-to-bottom by created_at.
    for (const arr of childrenByParent.values()) {
      arr.sort((a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      );
    }

    const NEW_CHILD_X_OFFSET = NODE_WIDTH + 60 + LINK_NODE_WIDTH + 80; // past parent's link stack
    const NEW_CHILD_Y_STEP   = NODE_HEIGHT + 30;

    const queue: Collection[] = [...(childrenByParent.get(null) ?? [])];
    let safety = 0;
    while (queue.length && safety++ < 5000) {
      const c = queue.shift()!;
      if (collectionPositions.has(c.id)) {
        // Already placed in a previous iteration (defensive).
      } else {
        let pos: { x: number; y: number };
        if (c.position_x != null && c.position_y != null) {
          pos = { x: c.position_x, y: c.position_y };
        } else if (c.parent_id && collectionPositions.has(c.parent_id)) {
          // Sibling-indexed offset so multiple newly-created children
          // don't stack on top of each other.
          const siblings = childrenByParent.get(c.parent_id) ?? [];
          const idx = siblings.findIndex((s) => s.id === c.id);
          const parentPos = collectionPositions.get(c.parent_id)!;
          pos = {
            x: parentPos.x + NEW_CHILD_X_OFFSET,
            y: parentPos.y + idx * NEW_CHILD_Y_STEP,
          };
        } else {
          const fb = fallback.get(c.id) ?? { x: 0, y: 0 };
          pos = { x: fb.x, y: fb.y };
        }
        collectionPositions.set(c.id, pos);
      }
      // Queue this folder's children for placement.
      const kids = childrenByParent.get(c.id) ?? [];
      queue.push(...kids);
    }

    // Emit collection nodes in stable collections-array order so React
    // doesn't reshuffle node identities each render.
    for (const c of collections) {
      const pos = collectionPositions.get(c.id) ?? { x: 0, y: 0 };
      out.push({
        id: c.id,
        type: "collection",
        position: pos,
        data: { collection: c, onOpen, onCreateChild, onCreateLink },
        draggable: true,
      });
    }

    // Group links by their collection_id and stack them vertically to
    // the right of the folder. Sorting by created_at DESC keeps new
    // links at the top so a freshly-added one appears RIGHT next to
    // its parent collection — exactly where the user would expect it.
    const linksByCollection = new Map<string, LinkType[]>();
    for (const l of links) {
      if (!l.collection_id) continue;
      if (!collectionPositions.has(l.collection_id)) continue;
      if (!linksByCollection.has(l.collection_id)) linksByCollection.set(l.collection_id, []);
      linksByCollection.get(l.collection_id)!.push(l);
    }

    const LINK_X_OFFSET = NODE_WIDTH + 60;   // distance to the right of the folder
    const LINK_Y_SPACING = LINK_NODE_HEIGHT + 12;

    for (const [collectionId, collectionLinks] of linksByCollection) {
      const anchor = collectionPositions.get(collectionId)!;
      // Sort newest first so an added link appears at the top of the
      // stack. Falls back to id ordering when timestamps are equal.
      const sorted = [...collectionLinks].sort((a, b) => {
        const at = new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
        return at !== 0 ? at : a.id.localeCompare(b.id);
      });
      // Centre the link stack vertically around the folder's middle row.
      const stackHeight = sorted.length * LINK_Y_SPACING - 12;
      const startY = anchor.y + NODE_HEIGHT / 2 - stackHeight / 2;

      sorted.forEach((l, idx) => {
        out.push({
          id: `link:${l.id}`,
          type: "link",
          position: {
            x: anchor.x + LINK_X_OFFSET,
            y: startY + idx * LINK_Y_SPACING,
          },
          data: { link: l, onOpen: handleOpenLink },
          draggable: true,
          selectable: true,
        });
      });
    }
    return out;
  }, [collections, links, fallback, onOpen, onCreateChild, onCreateLink, handleOpenLink]);

  const initialEdges: Edge[] = useMemo(() => {
    const out: Edge[] = [];
    // Parent → child folder edges (movable / deletable on the canvas).
    for (const c of collections) {
      if (c.parent_id) {
        out.push({
          id: `${c.parent_id}-${c.id}`,
          source: c.parent_id,
          target: c.id,
          animated: false,
          style: { stroke: "#00D26A", strokeWidth: 2, opacity: 0.55 },
        });
      }
    }
    // Folder → link edges. Marked non-deletable so accidental Backspace
    // doesn't strip a link out of its collection (use the link page for
    // that operation).
    for (const l of links) {
      if (!l.collection_id) continue;
      out.push({
        id: `${l.collection_id}-link:${l.id}`,
        source: l.collection_id,
        target: `link:${l.id}`,
        animated: false,
        deletable: false,
        style: { stroke: "#ffffff", strokeWidth: 1.5, opacity: 0.2, strokeDasharray: "4 4" },
      });
    }
    return out;
  }, [collections, links]);

  const [nodes, setNodes] = useNodesState<Node>(initialNodes);
  const [edges, setEdges] = useEdgesState<Edge>(initialEdges);

  // Re-sync local state when the upstream collections / links list
  // changes. Merge rather than overwrite:
  //  - COLLECTION nodes: keep the current in-canvas position (drag survives
  //    unrelated re-renders) but pick up data/label updates from
  //    initialNodes.
  //  - LINK nodes: always use the computed position so a newly-created
  //    link snaps next to its parent without leftover stale coords.
  //  - Brand-new nodes (not in current state): adopt initialNodes wholesale.
  // This is what makes a freshly-created link appear instantly on the
  // canvas: the new node ID isn't in `current`, so it falls through to
  // the initialNodes definition and gets rendered immediately.
  useEffect(() => {
    setNodes((current) => {
      const currentMap = new Map(current.map((n) => [n.id, n]));
      return initialNodes.map((n) => {
        const existing = currentMap.get(n.id);
        if (existing && n.type === "collection") {
          return { ...n, position: existing.position };
        }
        return n;
      });
    });
  }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      // Persist position on every drag-stop event — but only for
      // collection nodes. Link nodes have IDs prefixed with "link:" and
      // their positions are dagre-derived each render; nothing to save.
      for (const change of changes) {
        if (change.type === "position" && change.dragging === false && change.position) {
          if (!change.id.startsWith("link:")) {
            onMoveNode(change.id, change.position.x, change.position.y);
          }
        }
      }
    },
    [onMoveNode, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((es) => applyEdgeChanges(changes, es));
      // Unparent the child collection when its parent-edge is removed.
      // Link → collection edges are non-deletable (set above) so we
      // don't need to filter them out explicitly — they never reach the
      // remove branch via Backspace.
      for (const change of changes) {
        if (change.type === "remove") {
          const removed = edges.find((e) => e.id === change.id);
          if (removed && !removed.target.startsWith("link:")) {
            onReparent(removed.target, null);
          }
        }
      }
    },
    [edges, onReparent, setEdges]
  );

  // Drag a wire from a node's source handle (right) to another node's
  // target handle (left) → set the target's parent to the source.
  // Reject link → collection or collection → link connects — links are
  // managed on the links page, not via the canvas.
  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      if (conn.source.startsWith("link:") || conn.target.startsWith("link:")) {
        toast.error("Move links via the links page, not the canvas");
        return;
      }
      if (conn.source === conn.target) {
        toast.error("A folder can't be its own parent");
        return;
      }
      if (wouldCreateCycle(conn.target, conn.source, collections)) {
        toast.error("Can't connect — would create a cycle");
        return;
      }
      onReparent(conn.target, conn.source);
      toast.success("Linked as sub-folder");
    },
    [collections, onReparent]
  );

  // Re-runs dagre from scratch and snaps every collection node into the
  // computed slot. Used by the "Tidy" button so a user who's moved nodes
  // into a mess can recover a clean tree-like layout in one click.
  // Link nodes follow automatically because their positions are derived
  // from the parent folder's position in the useMemo above.
  const handleTidy = useCallback(() => {
    const fresh = autoLayout(collections);
    // Persist new collection positions — the useMemo recomputes nodes
    // from collections + links on the next render, so we don't need to
    // setNodes manually here (avoids a flash of intermediate state).
    for (const c of collections) {
      const pos = fresh.get(c.id);
      if (pos) onMoveNode(c.id, pos.x, pos.y);
    }
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 600, maxZoom: 1.2 });
    }, 100);
    toast.success("Layout tidied up");
  }, [collections, onMoveNode, fitView]);

  return (
    <div className={cn(
      "relative border bg-black/40 overflow-hidden",
      fullHeight ? "h-full border-white/5 rounded-none" : "h-[600px] border-white/5 rounded-2xl"
    )}>
      {/* Tidy button — top-left so it's a thumb away from the controls
          but doesn't overlap MiniMap on the right. */}
      <button
        type="button"
        onClick={handleTidy}
        className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 h-9 rounded-xl border border-[#00D26A]/30 bg-black/70 backdrop-blur-md text-[#00D26A] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/15 transition-all shadow-[0_0_15px_rgba(0,210,106,0.15)]"
        title="Auto-arrange the canvas — re-runs the tree layout"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Tidy
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={2}
        connectionLineStyle={{ stroke: "#00D26A", strokeWidth: 2 }}
        defaultEdgeOptions={{
          style: { stroke: "#00D26A", strokeWidth: 2, opacity: 0.5 },
          // Backspace on a selected edge fires an EdgeChange of type
          // "remove" → onEdgesChange unparents the child.
          deletable: true,
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} color="#1c1c1c" gap={24} lineWidth={1} />
        <Controls className="!bg-black/60 !border-white/10 [&_button]:!bg-transparent [&_button]:!border-white/5 [&_button]:!text-neutral-300 [&_button:hover]:!bg-white/5" />
        <MiniMap
          nodeColor={(n) => {
            // Links show as neutral pins; folders use their own colour.
            if (n.type === "link") return "#444";
            const data = n.data as CollectionNodeData | undefined;
            return data?.collection?.color || "#00D26A";
          }}
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-black/80 !border !border-white/10 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}

export function CollectionsCanvas(props: CollectionsCanvasProps) {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
}
