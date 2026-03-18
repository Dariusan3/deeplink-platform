"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
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
import { useTeam } from "@/hooks/use-team";
import { toast } from "sonner";

interface CreateTeamDialogProps {
  trigger?: React.ReactNode;
  nativeButton?: boolean;
}

export function CreateTeamDialog({ trigger, nativeButton }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const { createTeam } = useTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Team name is required");
      return;
    }

    setLoading(true);
    try {
      await createTeam(name);
      toast.success("Team established successfully!");
      setOpen(false);
      setName("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create team.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id="create-team-dialog-trigger"
        nativeButton={nativeButton !== undefined ? nativeButton : !trigger}
        render={
          trigger ? (
            trigger as React.ReactElement
          ) : (
            <Button className="btn-primary-pulse rounded-xl h-11 px-6 font-black uppercase text-xs tracking-widest gap-2">
              <Plus className="w-4 h-4" />
              Establish Team
            </Button>
          )
        }
      />
      <DialogContent className="glass-card bg-black/90 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <Users className="w-5 h-5" />
            </div>
            New Command Unit
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
              Team Identification
            </Label>
            <Input
              id="team-name"
              placeholder="e.g. Marketing Strike Force"
              className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-tight">
              Create a new collaborative workspace for your intelligence assets.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-primary font-black uppercase text-xs tracking-[0.2em] rounded-xl h-12 shadow-[0_0_30px_rgba(0,210,106,0.2)]"
            >
              {loading ? "Establishing..." : "Authorize Deployment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
