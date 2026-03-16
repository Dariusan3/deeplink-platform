import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeamsPage() {
  return (
    <>
      <Header title="Collaborative Teams" />
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white">Personnel</h2>
            <p className="text-sm text-neutral-500 font-medium">
              Manage multi-user access and secure collaboration.
            </p>
          </div>
          <Button className="btn-primary-pulse h-12 px-8 rounded-xl text-black font-black uppercase tracking-widest text-xs">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Team
          </Button>
        </div>

        <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-xl font-black tracking-tight text-white">Active Units</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
              <div className="w-20 h-20 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,210,106,0.05)] border border-[#00D26A]/10">
                <svg className="w-10 h-10 text-[#00D26A]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-white mb-2">Standalone Mode</h3>
              <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                You are currently operating solo. <br />
                Create a team to distribute authority and share intelligence.
              </p>
              <Button className="mt-8 btn-secondary-glass rounded-xl px-8 font-black uppercase text-xs tracking-widest h-11">
                Establish Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
