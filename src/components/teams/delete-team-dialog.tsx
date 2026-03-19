"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTeam } from "@/hooks/use-team";
import { toast } from "sonner";
import { Team } from "@/providers/team-provider";

interface DeleteTeamDialogProps {
  team: Team;
  trigger?: React.ReactNode;
  nativeButton?: boolean;
}

export function DeleteTeamDialog({ team, trigger, nativeButton }: DeleteTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { deleteTeam } = useTeam();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteTeam(team.id);
      toast.success("Team deleted successfully");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id={`delete-team-dialog-trigger-${team.id}`}
        nativeButton={nativeButton !== undefined ? nativeButton : !trigger}
        onClick={(e) => e.stopPropagation()}
        render={
          trigger ? (
            trigger as React.ReactElement
          ) : (
            <button
              className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              title="Delete Team"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        }
      />
      
      <DialogContent 
        className="glass-card bg-black/90 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-white sm:max-w-[425px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2 text-red-500">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5" />
            </div>
            Delete Team
          </DialogTitle>
          <DialogDescription className="text-neutral-400 mt-2">
            Are you sure you want to permanently delete the <strong>{team.name}</strong> team? This action cannot be undone and all associated logic rules will be destroyed.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="pt-6 sm:justify-start gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={handleDelete}
            className="w-full font-black uppercase text-xs tracking-[0.2em] rounded-xl h-12 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
          >
            {loading ? "Deleting..." : "Confirm Deletion"}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => setOpen(false)}
            className="w-full bg-white/4 border border-white/10 hover:bg-white/8 hover:border-white/20 text-neutral-300 hover:text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl h-12 transition-all"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
