"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePartner } from "@/hooks/use-partner";
import { Lightbulb, ChevronUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  done: "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function PartnerSuggestionsPage() {
  const { suggestions, profile, submitSuggestion, voteSuggestion } = usePartner();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitSuggestion(title, body);
      setTitle("");
      setBody("");
      setShowForm(false);
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const sorted = [...suggestions].sort((a, b) => b.votes - a.votes);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">Partner Dashboard</p>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Suggestions</h1>
          <p className="text-sm text-neutral-500 mt-1">Shape the roadmap. Vote on others, submit your own.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-xs tracking-widest h-10 px-5 gap-2"
        >
          <Plus className="w-4 h-4" /> New Suggestion
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-[#00D26A]/20 bg-[#00D26A]/5">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary of the idea"
                className="bg-white/[0.02] border-white/10 h-11"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">Description</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's the problem and how would this solve it?"
                rows={5}
                maxLength={1000}
                className="w-full resize-none bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="h-10 px-4 text-xs font-black uppercase tracking-widest text-neutral-500">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !body.trim() || !profile}
                className="h-10 px-5 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-xs tracking-widest"
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#00D26A]" />
            Roadmap ({sorted.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-neutral-500">No suggestions yet — be the first</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((s) => (
                <div key={s.id} className="flex gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <button
                    onClick={() => voteSuggestion(s.id)}
                    className="flex flex-col items-center justify-center w-12 shrink-0 py-2 px-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-[#00D26A]/30 hover:bg-[#00D26A]/5 transition-all"
                  >
                    <ChevronUp className="w-4 h-4 text-[#00D26A]" />
                    <span className="text-sm font-black text-white">{s.votes}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-black text-white">{s.title}</h3>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border shrink-0",
                        STATUS_STYLES[s.status]
                      )}>
                        {s.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">{s.body}</p>
                    <p className="text-[9px] text-neutral-600 mt-2">
                      {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
