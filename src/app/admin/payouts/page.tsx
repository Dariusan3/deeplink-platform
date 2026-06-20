"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Wallet, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Payout {
  id: string;
  amount: number;
  method: string;
  status: "requested" | "paid" | "rejected";
  reference: string | null;
  created_at: string;
  paid_at: string | null;
  partner_email: string;
  partner_name: string | null;
  wallet_network: string | null;
  wallet_address: string | null;
}

type Filter = "requested" | "paid" | "rejected" | "all";

const STATUS_CHIP: Record<string, string> = {
  requested: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  paid: "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("requested");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Per-row tx hash / reference the admin pastes after sending crypto.
  const [refs, setRefs] = useState<Record<string, string>>({});

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partner/payouts");
      const json = await res.json();
      if (res.ok) setPayouts(json.payouts as Payout[]);
      else toast.error(json.error || "Failed to load payouts");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const counts = useMemo(() => ({
    requested: payouts.filter((p) => p.status === "requested").length,
    paid: payouts.filter((p) => p.status === "paid").length,
    rejected: payouts.filter((p) => p.status === "rejected").length,
    all: payouts.length,
  }), [payouts]);

  const filtered = filter === "all" ? payouts : payouts.filter((p) => p.status === filter);

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 1500);
  };

  const process = async (id: string, status: "paid" | "rejected") => {
    if (status === "paid" && !refs[id]?.trim()) {
      toast.error("Paste the transaction hash / reference first");
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/partner/payout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: id, status, reference: refs[id]?.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      toast.success(status === "paid" ? "Marked as paid — partner notified" : "Payout rejected");
      fetchPayouts();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "requested", label: "Requested" },
    { key: "paid", label: "Paid" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Payouts"
        subtitle={`${counts.requested} awaiting payment · ${counts.paid} paid`}
        icon={Wallet}
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 w-fit">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              filter === key ? "bg-[#00D26A]/10 text-[#00D26A]" : "text-neutral-500 hover:text-white hover:bg-white/5"
            )}
          >
            {label}
            <span className={cn("text-[9px]", filter === key ? "text-[#00D26A]/70" : "text-neutral-600")}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#00D26A]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
          <Wallet className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-400">
            {filter === "requested" ? "No payout requests waiting" : "Nothing here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="glass-card border-white/5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: who + how much */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-black text-white">${p.amount.toFixed(2)}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        STATUS_CHIP[p.status]
                      )}>
                        {p.status}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        {p.method}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white mt-1">{p.partner_name || p.partner_email}</p>
                    <p className="text-[11px] text-neutral-500">{p.partner_email}</p>
                    <p className="text-[10px] text-neutral-600 mt-1">
                      Requested {new Date(p.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {p.paid_at && ` · Paid ${new Date(p.paid_at).toLocaleDateString()}`}
                    </p>
                  </div>

                  {/* Right: wallet to send to */}
                  <div className="min-w-0 sm:text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                      Send to {p.wallet_network || "—"}
                    </p>
                    {p.wallet_address ? (
                      <button
                        onClick={() => copyAddr(p.wallet_address!)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-white bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 hover:border-[#00D26A]/30 transition-all max-w-[280px]"
                        title="Copy address"
                      >
                        <span className="truncate">{p.wallet_address}</span>
                        {copied === p.wallet_address ? (
                          <Check className="w-3.5 h-3.5 text-[#00D26A] shrink-0" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        )}
                      </button>
                    ) : (
                      <p className="text-xs text-amber-400 font-bold">No wallet set</p>
                    )}
                  </div>
                </div>

                {/* Action row — only for requests still waiting */}
                {p.status === "requested" && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 flex-wrap">
                    <Input
                      value={refs[p.id] ?? ""}
                      onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                      placeholder="Transaction hash (after you send crypto)"
                      className="flex-1 min-w-[200px] h-10 bg-white/[0.02] border-white/10 font-mono text-xs"
                    />
                    <Button
                      onClick={() => process(p.id, "paid")}
                      disabled={busyId === p.id || !p.wallet_address}
                      className="h-10 px-4 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-[10px] tracking-widest gap-2 disabled:opacity-50"
                    >
                      {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Mark Paid
                    </Button>
                    <Button
                      onClick={() => process(p.id, "rejected")}
                      disabled={busyId === p.id}
                      variant="ghost"
                      className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-red-400"
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {/* Paid reference (tx hash) shown read-only */}
                {p.status === "paid" && p.reference && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Tx</span>
                    <span className="font-mono text-xs text-neutral-400 truncate">{p.reference}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-600 shrink-0" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
