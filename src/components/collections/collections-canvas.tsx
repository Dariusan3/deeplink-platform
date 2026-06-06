"use client";

import { useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
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
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { FolderOpen, Link2, FolderPlus } from "lucide-react";
import { Collection } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Miro-style canvas for collections. Folders are nodes; parent_id forms
// the edges. First mount runs a dagre top-down auto-layout for any
// collection that hasn't been positioned manually. Drag a node to move
// it — position_x/y is persisted via saveCollectionPosition.

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;

interface CollectionNodeData {
  collection: Collection;
  onOpen: (id: string) => void;
  onCreateChild?: (parentId: string) => void;
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
      {/* Target handle (parent connects to me from above). Made larger
          and visible-on-hover so users can grab it easily. */}
      <Handle
        type="target"
        position={Position.Top}
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

      {/* Quick "+ Sub-folder" button on hover. Opens the create dialog
          with this collection pre-selected as parent. */}
      {data.onCreateChild && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onCreateChild!(c.id); }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-[#00D26A] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(0,210,106,0.4)]"
          title="Create sub-folder here"
        >
          <FolderPlus className="w-3 h-3" />
        </button>
      )}

      {/* Source handle (drag from here to another node's top to set
          THAT node's parent to me). */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[#00D26A]/50 !border-2 !border-[#00D26A] !w-3 !h-3 hover:!bg-[#00D26A] transition-all"
      />
    </div>
  );
}

const nodeTypes = { collection: CollectionNode };

// Build dagre layout — assigns position_x/y to any node missing one.
// Returns the augmented set so React Flow has coordinates to render.
function autoLayout(collections: Collection[]): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120, marginx: 40, marginy: 40 });

  for (const c of collections) {
    g.setNode(c.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const c of collections) {
    if (c.parent_id) g.setEdge(c.parent_id, c.id);
  }
  dagre.layout(g);

  const out = new Map<string, { x: number; y: number }>();
  for (const c of collections) {
    const n = g.node(c.id);
    if (n) {
      // dagre centres the node; React Flow positions by top-left corner.
      out.set(c.id, { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 });
    }
  }
  return out;
}

interface CollectionsCanvasProps {
  collections: Collection[];
  onOpen: (id: string) => void;
  onMoveNode: (id: string, x: number, y: number) => Promise<void> | void;
  onReparent: (childId: string, newParentId: string | null) => Promise<void> | void;
  onCreateChild?: (parentId: string) => void;
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

function InnerCanvas({ collections, onOpen, onMoveNode, onReparent, onCreateChild, fullHeight }: CollectionsCanvasProps) {
  // Pre-compute dagre fallback positions. Then prefer the persisted
  // position_x/y if present — the user's manual layout wins.
  const fallback = useMemo(() => autoLayout(collections), [collections]);

  const initialNodes: Node<CollectionNodeData>[] = useMemo(
    () =>
      collections.map((c) => {
        const fb = fallback.get(c.id) ?? { x: 0, y: 0 };
        return {
          id: c.id,
          type: "collection",
          position: {
            x: c.position_x ?? fb.x,
            y: c.position_y ?? fb.y,
          },
          data: { collection: c, onOpen, onCreateChild },
          draggable: true,
        };
      }),
    [collections, fallback, onOpen, onCreateChild]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      collections
        .filter((c) => c.parent_id)
        .map((c) => ({
          id: `${c.parent_id}-${c.id}`,
          source: c.parent_id!,
          target: c.id,
          animated: false,
          style: { stroke: "#00D26A", strokeWidth: 2, opacity: 0.5 },
        })),
    [collections]
  );

  const [nodes, setNodes] = useNodesState<Node<CollectionNodeData>>(initialNodes);
  const [edges, setEdges] = useEdgesState<Edge>(initialEdges);

  // Re-sync local state when the upstream collections list changes
  // (e.g. after a reparent or a new collection is created).
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<CollectionNodeData>>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      // Persist position on every drag-stop event.
      for (const change of changes) {
        if (change.type === "position" && change.dragging === false && change.position) {
          onMoveNode(change.id, change.position.x, change.position.y);
        }
      }
    },
    [onMoveNode, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((es) => applyEdgeChanges(changes, es));
      // If the user removes an edge (Backspace on a selected edge or via
      // the edge's delete button), unparent the child collection.
      for (const change of changes) {
        if (change.type === "remove") {
          const removed = edges.find((e) => e.id === change.id);
          if (removed) {
            onReparent(removed.target, null);
          }
        }
      }
    },
    [edges, onReparent, setEdges]
  );

  // Drag a wire from a node's source handle (bottom) to another node's
  // target handle (top) → set the target's parent to the source.
  // Validate against cycles client-side so we don't show the DB error
  // (which would be ugly).
  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
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

  return (
    <div className={cn(
      "border bg-black/40 overflow-hidden",
      fullHeight ? "h-full border-white/5 rounded-none" : "h-[600px] border-white/5 rounded-2xl"
    )}>
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
        <Background color="#222" gap={20} />
        <Controls className="!bg-black/60 !border-white/10 [&_button]:!bg-transparent [&_button]:!border-white/5 [&_button]:!text-neutral-300 [&_button:hover]:!bg-white/5" />
        <MiniMap
          nodeColor={(n) => {
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
