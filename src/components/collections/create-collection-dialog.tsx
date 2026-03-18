"use client";

import { useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
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
import { useCollections } from "@/hooks/use-collections";

const COLORS = ["#00D26A", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7", "#EC4899", "#14B8A6", "#F97316"];

export function CreateCollectionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#00D26A");
  const { createCollection } = useCollections();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createCollection(name, description, color);
      setOpen(false);
      setName("");
      setDescription("");
      setColor("#00D26A");
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id="create-collection-dialog-trigger"
        render={
          <Button className="btn-primary-pulse rounded-xl h-11 px-6 font-black uppercase text-xs tracking-widest gap-2">
            <Plus className="w-4 h-4" />
            New Collection
          </Button>
        }
      />
      <DialogContent className="glass-card bg-black/90 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <FolderOpen className="w-5 h-5" />
            </div>
            New Collection
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
              Name
            </Label>
            <Input
              placeholder="Marketing Links"
              className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
              Description (Optional)
            </Label>
            <Input
              placeholder="Links for marketing campaigns"
              className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
              Color
            </Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg transition-all"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                    opacity: color === c ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full btn-primary font-black uppercase text-xs tracking-[0.2em] rounded-xl h-12 shadow-[0_0_30px_rgba(0,210,106,0.2)]"
            >
              {loading ? "Creating..." : "Create Collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
