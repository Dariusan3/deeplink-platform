"use client";

import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/hooks/use-team";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog";
import { Users, Plus, Shield, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TeamsPage() {
  const { teams, activeTeam, setActiveTeam, loading, deleteTeam } = useTeam();

  return (
    <>
      <Header title="Collaborative Teams" />
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Personnel
            </h2>
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
              Multi-User Access & Secure Collaboration
            </p>
          </div>
          <CreateTeamDialog
            nativeButton={true}
            trigger={
              <Button className="btn-primary-pulse h-12 px-8 rounded-xl text-black font-black uppercase tracking-widest text-xs">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            }
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
            <CardContent className="px-8 py-20">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,210,106,0.05)] border border-[#00D26A]/10">
                  <Users className="w-10 h-10 text-[#00D26A]/40" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">
                  Standalone Mode
                </h3>
                <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                  You are currently operating solo. <br />
                  Create a team to distribute authority and share intelligence.
                </p>
                <CreateTeamDialog
                  nativeButton={true}
                  trigger={
                    <Button className="mt-8 btn-secondary-glass rounded-xl px-8 font-black uppercase text-xs tracking-widest h-11">
                      Establish Team
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card
                key={team.id}
                className={cn(
                  "glass-card bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 border-white/5 relative overflow-hidden group cursor-pointer",
                  activeTeam?.id === team.id &&
                    "border-[#00D26A]/30 bg-[#00D26A]/5",
                )}
                onClick={() => setActiveTeam(team)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D26A]/5 blur-[60px] rounded-full group-hover:bg-[#00D26A]/10 transition-all duration-500 -z-10 pointer-events-none" />

                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0">
                      <span className="text-lg font-black text-[#00D26A] uppercase">
                        {team.name.charAt(0)}
                      </span>
                    </div>
                    {activeTeam?.id === team.id && (
                      <div className="px-2 py-1 rounded-full bg-[#39FF14]/10 text-[#39FF14] text-[8px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(57,255,20,0.1)]">
                        Current Unit
                      </div>
                    )}
                    <div onClick={(e) => e.stopPropagation()} className="ml-auto flex items-center">
                      <DeleteTeamDialog
                        team={team}
                        nativeButton={true}
                        trigger={
                          <button
                            className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-6 space-y-4">
                  <div>
                    <CardTitle className="text-xl font-black text-white truncate group-hover:text-[#00D26A] transition-colors">
                      {team.name}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                      Slug: {team.slug}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">
                        Security
                      </span>
                      <div className="flex items-center gap-1 text-[#00D26A] text-[10px] font-bold">
                        <Shield className="w-3 h-3" />
                        Level 1 Access
                      </div>
                    </div>
                    <ArrowRight className="ml-auto w-4 h-4 text-neutral-600 group-hover:text-[#00D26A] group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}

            <CreateTeamDialog
              nativeButton={true}
              trigger={
                <button className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border border-dashed border-white/10 hover:border-[#00D26A]/40 hover:bg-[#00D26A]/5 transition-all group min-h-[220px]">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#00D26A]/10 transition-all">
                    <Plus className="w-6 h-6 text-neutral-500 group-hover:text-[#00D26A]" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-all">
                    Establish New Unit
                  </span>
                </button>
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
