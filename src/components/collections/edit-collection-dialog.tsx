"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollections, type Collection } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";

const COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#14B8A6", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
  "#EC4899", "#D946EF", "#78716C", "#000000",
  "#FF6B6B", "#00D26A",
];

export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
}: {
  collection: Collection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateCollection } = useCollections();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#EF4444");
  const [clickGoal, setClickGoal] = useState("");
  const [clickGoalPeriod, setClickGoalPeriod] = useState("daily");
  const [isRotator, setIsRotator] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [loading, setLoading] = useState(false);

  // Re-hydrate the form whenever the dialog opens for a new collection.
  useEffect(() => {
    if (collection && open) {
      setName(collection.name || "");
      setDescription(collection.description || "");
      setColor(collection.color || "#EF4444");
      setClickGoal(collection.click_goal != null ? String(collection.click_goal) : "");
      setClickGoalPeriod(collection.click_goal_period || "daily");
      setIsRotator(!!collection.is_rotator);
      setIsStarred(!!collection.is_starred);
    }
  }, [collection, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection || !name.trim()) return;

    setLoading(true);
    try {
      const parsedGoal = clickGoal.trim() === "" ? null : Number(clickGoal);
      await updateCollection(collection.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
        click_goal: parsedGoal,
        click_goal_period: parsedGoal === null ? null : clickGoalPeriod,
        is_rotator: isRotator,
        is_starred: isStarred,
      });
      onOpenChange(false);
    } catch {
      // useCollections shows toast on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-black/90 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <FolderOpen className="w-5 h-5" />
            </div>
            Edit Collection
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-black text-white">
              Name <span className="text-neutral-500">(required)</span>
            </Label>
            <Input
              placeholder="Marketing Links"
              className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-white">Description</Label>
            <textarea
              placeholder="Links for marketing campaigns, promos, etc."
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50 resize-none h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-white">Collection Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-9 h-9 rounded-lg transition-all flex items-center justify-center",
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-white flex items-center gap-1.5">
              Click Goal <span className="text-neutral-500">(optional)</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                placeholder="e.g. 500"
                className="bg-white/[0.03] border-white/10 rounded-xl h-10 text-sm w-28"
                value={clickGoal}
                onChange={(e) => setClickGoal(e.target.value)}
              />
              <span className="text-xs text-neutral-500 font-bold">clicks per</span>
              <select
                value={clickGoalPeriod}
                onChange={(e) => setClickGoalPeriod(e.target.value)}
                className="h-10 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
              >
                <option value="daily" className="bg-neutral-900">Day</option>
                <option value="weekly" className="bg-neutral-900">Week</option>
                <option value="monthly" className="bg-neutral-900">Month</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <p className="text-sm font-bold text-white">Enable Rotator Link</p>
            <button
              type="button"
              onClick={() => setIsRotator(!isRotator)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-all duration-300",
                isRotator ? "bg-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.3)]" : "bg-white/5 border border-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm",
                isRotator ? "left-7 bg-white" : "left-1 bg-neutral-500"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">Star Collection</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Starred collections show in the sidebar for quick access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-all duration-300",
                isStarred ? "bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "bg-white/5 border border-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm",
                isStarred ? "left-7 bg-white" : "left-1 bg-neutral-500"
              )} />
            </button>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-xs tracking-widest rounded-xl h-11 px-6 gap-2"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
