"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { usePartner } from "@/hooks/use-partner";
import {
  Lightbulb, ChevronUp, Plus, Sparkles, Rocket, CircleDot, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PartnerSuggestionStatus } from "@/types/partner";

// Status metadata — label, accent colour, icon. Kept to the same signal
// palette as the rest of the app (neutral / amber / green / red).
const STATUS_META: Record<PartnerSuggestionStatus, {
  label: string; chip: string; icon: typeof CircleDot;
}> = {
  open:        { label: "Open",        chip: "bg-white/5 text-neutral-300 border-white/10",        icon: CircleDot },
  in_progress: { label: "In Progress", chip: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock },
  done:        { label: "Shipped",     chip: "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30", icon: CheckCircle2 },
  rejected:    { label: "Declined",    chip: "bg-red-500/10 text-red-400 border-red-500/30",        icon: XCircle },
};

type Filter = "all" | PartnerSuggestionStatus;

export default function PartnerSuggestionsPage() {
  const { suggestions, profile, submitSuggestion, voteSuggestion } = usePartner();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  // Track which ones the user voted this session — instant feedback +
  // stops double-voting in one sitting (server enforces the real rule).
  const [voted, setVoted] = useState<Set<string>>(new Set());

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

  const handleVote = async (id: string) => {
    if (voted.has(id)) return;
    setVoted((prev) => new Set(prev).add(id));
    try {
      await voteSuggestion(id);
    } catch {
      setVoted((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const counts = useMemo(() => ({
    total: suggestions.length,
    inProgress: suggestions.filter((s) => s.status === "in_progress").length,
    shipped: suggestions.filter((s) => s.status === "done").length,
    totalVotes: suggestions.reduce((sum, s) => sum + s.votes, 0),
  }), [suggestions]);

  const filtered = useMemo(() => {
    const list = filter === "all" ? suggestions : suggestions.filter((s) => s.status === filter);
    return [...list].sort((a, b) => b.votes - a.votes);
  }, [suggestions, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "done", label: "Shipped" },
    { key: "rejected", label: "Declined" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-20">
      <PageHeader
        eyebrow="Partner Dashboard"
        title="Suggestions"
        subtitle="Shape the roadmap. Vote on ideas, submit your own."
        action={
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-xs tracking-widest h-10 px-5 gap-2"
          >
            <Plus className="w-4 h-4" /> New Idea
          </Button>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Lightbulb} iconClass="text-[#00D26A] bg-[#00D26A]/10" value={counts.total} label="Ideas" />
        <StatTile icon={ChevronUp} iconClass="text-[#00D26A] bg-[#00D26A]/10" value={counts.totalVotes} label="Total votes" />
        <StatTile icon={Clock} iconClass="text-amber-400 bg-amber-500/10" value={counts.inProgress} label="In progress" />
        <StatTile icon={Rocket} iconClass="text-[#00D26A] bg-[#00D26A]/10" value={counts.shipped} label="Shipped" />
      </div>

      {/* New idea form */}
      {showForm && (
        <Card className="glass-card border-[#00D26A]/20 bg-[#00D26A]/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00D26A]" />
              <span className="text-sm font-black text-white">Pitch your idea</span>
            </div>
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
              <p className="text-[10px] text-neutral-600 text-right">{body.length}/1000</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="h-10 px-4 text-xs font-black uppercase tracking-widest text-neutral-500">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !body.trim() || !profile}
                className="h-10 px-5 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-xs tracking-widest disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 w-fit overflow-x-auto">
        {FILTERS.map(({ key, label }) => {
          const n = key === "all" ? counts.total : suggestions.filter((s) => s.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filter === key ? "bg-[#00D26A]/10 text-[#00D26A]" : "text-neutral-500 hover:text-white hover:bg-white/5"
              )}
            >
              {label}
              <span className={cn("text-[9px]", filter === key ? "text-[#00D26A]/70" : "text-neutral-600")}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mb-4">
            <Lightbulb className="w-6 h-6 text-[#00D26A]" />
          </div>
          <p className="text-sm font-bold text-white">
            {filter === "all" ? "No ideas yet — be the first" : "Nothing here"}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {filter === "all" ? "Got a feature in mind? Pitch it above." : "Try another filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const meta = STATUS_META[s.status];
            const StatusIcon = meta.icon;
            const hasVoted = voted.has(s.id);
            const isTop = filter === "all" && i === 0 && s.votes > 0;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex gap-3 p-4 rounded-2xl border transition-all",
                  isTop ? "bg-[#00D26A]/[0.04] border-[#00D26A]/20" : "bg-white/[0.02] border-white/5 hover:border-white/10"
                )}
              >
                {/* Vote button */}
                <button
                  onClick={() => handleVote(s.id)}
                  disabled={hasVoted}
                  className={cn(
                    "flex flex-col items-center justify-center w-14 shrink-0 py-2 rounded-xl border transition-all",
                    hasVoted
                      ? "bg-[#00D26A]/15 border-[#00D26A]/40 cursor-default"
                      : "bg-white/[0.02] border-white/5 hover:border-[#00D26A]/30 hover:bg-[#00D26A]/5"
                  )}
                  title={hasVoted ? "You voted" : "Upvote"}
                >
                  <ChevronUp className={cn("w-4 h-4", hasVoted ? "text-[#00D26A]" : "text-neutral-400")} />
                  <span className={cn("text-base font-black", hasVoted ? "text-[#00D26A]" : "text-white")}>{s.votes}</span>
                </button>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-black text-white">
                      {isTop && <span className="text-[#00D26A] mr-1">★</span>}
                      {s.title}
                    </h3>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0",
                      meta.chip
                    )}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{s.body}</p>
                  <p className="text-[9px] text-neutral-600 mt-2">
                    {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon, iconClass, value, label,
}: {
  icon: typeof Lightbulb;
  iconClass: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black text-white leading-none">{value}</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
