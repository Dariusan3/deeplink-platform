"use client";

import { useState, useMemo, useCallback } from "react";
import { Collection } from "@/hooks/use-collections";
import type { Link as LinkType } from "@/types/links";
import { FolderOpen, ChevronRight, ChevronDown, Link2, Pencil, Trash2, FolderPlus, LinkIcon, ExternalLink, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Tree node type — derived from the flat collections list by linking
// children to their parent via parent_id.
export interface TreeNode {
  collection: Collection;
  children: TreeNode[];
}

// Build a tree from the flat list. Collections with parent_id pointing
// to a missing parent fall back to root (defensive — shouldn't happen
// because we have a FK with ON DELETE CASCADE, but safe to be robust).
export function buildTree(collections: Collection[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const c of collections) {
    byId.set(c.id, { collection: c, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const c of collections) {
    const node = byId.get(c.id)!;
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Stable display order: name asc within each level.
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.collection.name.localeCompare(b.collection.name));
    for (const n of nodes) sort(n.children);
  };
  sort(roots);
  return roots;
}

// Returns true if `descendantId` is in the subtree of `ancestorId`. Used
// to prevent dropping a collection into its own descendants (would
// create a cycle — the DB trigger blocks it too, but UI should reject
// early for a better UX).
function isDescendantOf(
  ancestorId: string,
  descendantId: string,
  collections: Collection[]
): boolean {
  let cursor: string | null = descendantId;
  const visited = new Set<string>();
  while (cursor) {
    if (visited.has(cursor)) return false; // cycle protection — shouldn't happen
    visited.add(cursor);
    if (cursor === ancestorId) return true;
    const next: Collection | undefined = collections.find((c) => c.id === cursor);
    cursor = next?.parent_id ?? null;
  }
  return false;
}

interface CollectionsTreeProps {
  collections: Collection[];
  // Links to render as leaf rows inside their collection (Finder-style).
  // Omit to show only the folder hierarchy.
  links?: LinkType[];
  onOpen: (collectionId: string) => void;
  onEdit: (collectionId: string) => void;
  onDelete: (collectionId: string) => void;
  onReparent: (childId: string, newParentId: string | null) => Promise<void> | void;
  // Triggered when the user clicks the "+" icon on a row to create a
  // sub-folder under that collection. The parent page is responsible
  // for opening the CreateCollectionDialog with the parent pre-selected.
  onCreateChild?: (parentId: string) => void;
  // Same idea but for creating a NEW LINK pre-assigned to this collection.
  onCreateLink?: (collectionId: string) => void;
  // Clicking a link leaf selects it — the page shows its info panel.
  selectedLinkId?: string | null;
  onSelectLink?: (linkId: string) => void;
}

export function CollectionsTree({
  collections,
  links = [],
  onOpen,
  onEdit,
  onDelete,
  onReparent,
  onCreateChild,
  onCreateLink,
  selectedLinkId,
  onSelectLink,
}: CollectionsTreeProps) {
  const tree = useMemo(() => buildTree(collections), [collections]);
  // Group links by collection_id for O(1) lookup when rendering a folder.
  const linksByCollection = useMemo(() => {
    const map = new Map<string, LinkType[]>();
    for (const l of links) {
      if (!l.collection_id) continue;
      if (!map.has(l.collection_id)) map.set(l.collection_id, []);
      map.get(l.collection_id)!.push(l);
    }
    // Newest first within each folder.
    for (const arr of map.values()) {
      arr.sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    }
    return map;
  }, [links]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Start with all root nodes expanded so the user immediately sees
    // their hierarchy.
    return new Set(collections.filter((c) => !c.parent_id).map((c) => c.id));
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDropOnto = useCallback(async (childId: string, newParentId: string | null) => {
    if (childId === newParentId) return;
    if (newParentId && isDescendantOf(childId, newParentId, collections)) {
      toast.error("Can't move a folder into one of its own sub-folders");
      return;
    }
    // Auto-expand the new parent so the user sees the moved row land.
    if (newParentId) {
      setExpanded((prev) => new Set(prev).add(newParentId));
    }
    try {
      await onReparent(childId, newParentId);
      toast.success(newParentId ? "Moved into folder" : "Moved to root");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move");
    }
  }, [collections, onReparent]);

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-white/5">
        <p className="text-sm font-bold text-neutral-500">No collections yet</p>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (dragging && (e.target as HTMLElement).closest("[data-tree-node]") === null) {
          setDragOverRoot(true);
          setDragOverId(null);
        }
      }}
      onDragLeave={() => setDragOverRoot(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOverRoot(false);
        if (dragging) {
          await handleDropOnto(dragging, null);
        }
        setDragging(null);
      }}
      className={cn(
        "rounded-2xl border bg-white/[0.01] p-2 transition-all",
        dragOverRoot
          ? "border-[#00D26A]/40 bg-[#00D26A]/[0.04]"
          : "border-white/5"
      )}
    >
      {tree.map((node) => (
        <TreeRow
          key={node.collection.id}
          node={node}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          onOpen={onOpen}
          onEdit={onEdit}
          onDelete={onDelete}
          onCreateChild={onCreateChild}
          onCreateLink={onCreateLink}
          linksByCollection={linksByCollection}
          selectedLinkId={selectedLinkId}
          onSelectLink={onSelectLink}
          dragging={dragging}
          setDragging={setDragging}
          dragOverId={dragOverId}
          setDragOverId={setDragOverId}
          onDrop={handleDropOnto}
        />
      ))}
      {dragOverRoot && (
        <p className="text-[10px] font-black uppercase tracking-widest text-[#00D26A] text-center py-2">
          Drop here to move to root level
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateChild?: (parentId: string) => void;
  onCreateLink?: (collectionId: string) => void;
  linksByCollection: Map<string, LinkType[]>;
  selectedLinkId?: string | null;
  onSelectLink?: (linkId: string) => void;
  dragging: string | null;
  setDragging: (id: string | null) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
  onDrop: (childId: string, newParentId: string | null) => Promise<void> | void;
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onOpen,
  onEdit,
  onDelete,
  onCreateChild,
  onCreateLink,
  linksByCollection,
  selectedLinkId,
  onSelectLink,
  dragging,
  setDragging,
  dragOverId,
  setDragOverId,
  onDrop,
}: TreeRowProps) {
  const isOpen = expanded.has(node.collection.id);
  const folderLinks = linksByCollection.get(node.collection.id) ?? [];
  const hasChildren = node.children.length > 0 || folderLinks.length > 0;
  const isDragOver = dragOverId === node.collection.id;
  const isDragging = dragging === node.collection.id;
  const color = node.collection.color || "#00D26A";

  return (
    <div data-tree-node>
      <div
        draggable
        onDragStart={(e) => {
          setDragging(node.collection.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => { setDragging(null); setDragOverId(null); }}
        onDragOver={(e) => {
          if (!dragging || dragging === node.collection.id) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOverId(node.collection.id);
        }}
        onDragLeave={(e) => {
          if (dragOverId === node.collection.id) {
            // Only clear if we're truly leaving this row (not its child).
            const related = e.relatedTarget as Node | null;
            if (!related || !(e.currentTarget as Node).contains(related)) {
              setDragOverId(null);
            }
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragging && dragging !== node.collection.id) {
            await onDrop(dragging, node.collection.id);
          }
          setDragOverId(null);
          setDragging(null);
        }}
        className={cn(
          "group flex items-center gap-2 px-2 py-2 rounded-xl transition-all cursor-pointer",
          isDragOver && "bg-[#00D26A]/15 ring-1 ring-[#00D26A]/40",
          !isDragOver && "hover:bg-white/[0.03]",
          isDragging && "opacity-50"
        )}
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        {/* Expand chevron */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.collection.id); }}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded transition-all shrink-0",
            hasChildren ? "text-neutral-400 hover:text-white hover:bg-white/5" : "opacity-0 cursor-default"
          )}
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          {hasChildren && (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>

        {/* Color dot + folder icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <FolderOpen className="w-4 h-4" style={{ color }} />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0 flex items-baseline gap-2" onClick={() => onOpen(node.collection.id)}>
          <span className="text-sm font-bold text-white truncate">{node.collection.name}</span>
          <span className="text-[10px] text-neutral-500 font-medium shrink-0 inline-flex items-center gap-1">
            <Link2 className="w-2.5 h-2.5" />
            {node.collection.link_count || 0}
            {hasChildren && (
              <>
                <span className="mx-0.5">·</span>
                {node.children.length} folder{node.children.length !== 1 ? "s" : ""}
              </>
            )}
          </span>
        </div>

        {/* New sub-folder / new link / edit / delete */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          {onCreateChild && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onCreateChild(node.collection.id); }}
              className="h-7 w-7 text-neutral-600 hover:text-[#00D26A]"
              title="Create sub-folder here"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          )}
          {onCreateLink && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onCreateLink(node.collection.id); }}
              className="h-7 w-7 text-neutral-600 hover:text-blue-400"
              title="Create link in this collection"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onEdit(node.collection.id); }}
            className="h-7 w-7 text-neutral-600 hover:text-[#00D26A]"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(node.collection.id); }}
            className="h-7 w-7 text-neutral-600 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Children: sub-folders first, then link leaves (Finder order). */}
      {isOpen && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.collection.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
              onCreateLink={onCreateLink}
              linksByCollection={linksByCollection}
              selectedLinkId={selectedLinkId}
              onSelectLink={onSelectLink}
              dragging={dragging}
              setDragging={setDragging}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              onDrop={onDrop}
            />
          ))}
          {folderLinks.map((link) => (
            <LinkLeaf
              key={link.id}
              link={link}
              depth={depth + 1}
              selected={selectedLinkId === link.id}
              onSelect={onSelectLink}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Link leaf row — the "file" inside a folder. Clicking it selects the
// link (the page shows its info panel). Indented one level past its
// parent folder, like a file under a directory in Finder.

function LinkLeaf({
  link,
  depth,
  selected,
  onSelect,
}: {
  link: LinkType;
  depth: number;
  selected: boolean;
  onSelect?: (linkId: string) => void;
}) {
  let host = "";
  try { host = new URL(link.destination_url).hostname.replace(/^www\./, ""); } catch {}
  const paused = link.is_active === false;

  return (
    <div
      onClick={() => onSelect?.(link.id)}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all",
        selected ? "bg-[#00D26A]/15 ring-1 ring-[#00D26A]/40" : "hover:bg-white/[0.03]"
      )}
      style={{ paddingLeft: 8 + depth * 20 + 24 }}
    >
      <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
        <Link2 className={cn("w-3.5 h-3.5", selected ? "text-[#00D26A]" : "text-neutral-400")} />
      </div>
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className={cn("text-[13px] font-medium truncate", selected ? "text-white" : "text-neutral-300")}>
          {link.title || link.slug}
        </span>
        <span className="text-[10px] text-neutral-600 font-medium truncate shrink-0">
          {host}
        </span>
      </div>
      {paused && (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-400 shrink-0">
          <Pause className="w-2.5 h-2.5" /> paused
        </span>
      )}
      <span className="text-[10px] text-neutral-500 font-bold shrink-0 inline-flex items-center gap-1">
        <Link2 className="w-2.5 h-2.5" />
        {link.click_count ?? 0}
      </span>
      <a
        href={link.destination_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-600 hover:text-[#00D26A] opacity-0 group-hover:opacity-100 transition-all shrink-0"
        title="Open destination"
      >
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
