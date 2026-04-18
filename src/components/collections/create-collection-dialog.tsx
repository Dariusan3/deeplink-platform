"use client";

import { useState } from "react";
import { Plus, FolderOpen, Check, Star, Shuffle, HelpCircle, BarChart3, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollections } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";

const COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#14B8A6", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
  "#EC4899", "#D946EF", "#78716C", "#000000",
  "#FF6B6B", "#00D26A",
];

export function CreateCollectionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#EF4444");
  const [clickGoal, setClickGoal] = useState("");
  const [clickGoalPeriod, setClickGoalPeriod] = useState("daily");
  const [isRotator, setIsRotator] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const { createCollection } = useCollections();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createCollection(name, description, color, clickGoal ? Number(clickGoal) : undefined, clickGoal ? clickGoalPeriod : undefined, isRotator, isStarred);
      setOpen(false);
      resetForm();
    } catch {} finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("#EF4444");
    setClickGoal("");
    setClickGoalPeriod("daily");
    setIsRotator(false);
    setIsStarred(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger
        id="create-collection-dialog-trigger"
        render={
          <Button className="btn-primary-pulse rounded-xl h-11 px-6 font-black uppercase text-xs tracking-widest gap-2">
            <Plus className="w-4 h-4" />
            New Collection
          </Button>
        }
      />
      <DialogContent className="glass-card bg-black/90 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <FolderOpen className="w-5 h-5" />
            </div>
            Create a Collection
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {/* Name */}
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

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-white">Description</Label>
            <textarea
              placeholder="Links for marketing campaigns, promos, etc."
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50 resize-none h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Collection Color */}
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

          {/* Click Goal */}
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

          {/* Enable Rotator Link */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Enable Rotator Link</p>
              <div className="group relative">
                <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-help text-neutral-500 text-[9px] font-black">i</div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 w-56">
                  <div className="bg-black/95 border border-white/10 rounded-xl p-3 text-[10px] text-neutral-300 leading-relaxed shadow-2xl">
                    Creates a public URL that randomly redirects visitors to different links in this collection. Perfect for A/B testing or distributing traffic across multiple destinations.
                  </div>
                </div>
              </div>
            </div>
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

          {/* Star Collection */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">Star Collection</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Starred collections will show up in the sidebar navigation for quick access.
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-bold">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-xs tracking-widest rounded-xl h-11 px-6 gap-2"
            >
              {loading ? "Creating..." : "Create Collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Info Cards Component (for collections page sidebar) ───────
export function CollectionsInfo() {
  return (
    <div className="space-y-4">
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-neutral-400" />
            What are Collections?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Collections help you organize links into groups. You can also view aggregated click data for all links within a collection, set click goals per collection, and filter analytics by collection.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#00D26A]" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { step: 1, title: "Create a Collection", desc: 'Click the "New Collection" button, give it a name and color.' },
            { step: 2, title: "Add Links", desc: "When creating or editing a link, assign it to your new collection." },
            { step: 3, title: "Analyze Performance", desc: "View aggregated click data to see which campaigns are performing best." },
            { step: 4, title: "Set Goals", desc: "Add click goals per collection to track your targets on the Alerts page." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-[#00D26A]">{item.step}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">{item.title}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
