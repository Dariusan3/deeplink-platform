"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePartner } from "@/hooks/use-partner";
import { PageHeader } from "@/components/ui/page-header";
import { Wallet, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Supported crypto networks for payouts.
const NETWORKS = ["USDT (TRC20)", "USDT (ERC20)", "USDC (ERC20)", "BTC", "ETH", "SOL"];

export default function PartnerSettingsPage() {
  const { profile, updatePayoutMethod } = usePartner();
  const [network, setNetwork] = useState<string>(NETWORKS[0]);
  const [wallet, setWallet] = useState("");
  const [saving, setSaving] = useState(false);

  // Hydrate from server-saved value (crypto only).
  useEffect(() => {
    if (!profile?.payout_method) return;
    const m = profile.payout_method;
    if (m.type === "crypto") {
      setNetwork(m.network || NETWORKS[0]);
      setWallet(m.wallet_address || "");
    }
  }, [profile?.payout_method]);

  // Minimal sanity check — most chains use 26-95 char addresses.
  const isValid = wallet.trim().length >= 20 && !!network;

  const save = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await updatePayoutMethod({
        type: "crypto",
        network,
        wallet_address: wallet.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto pb-20">
      <PageHeader
        accent="purple"
        eyebrow="Partner Dashboard" title="Settings" />

      {/* Account info */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-[#A855F7]" /> Partner Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Referral Code" value={profile?.referral_code ?? "—"} mono />
          <Row label="Commission Rate" value={`${((profile?.commission_rate ?? 0.25) * 100).toFixed(0)}% recurring`} />
          <Row
            label="Activated"
            value={profile?.activated_at ? new Date(profile.activated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
          />
        </CardContent>
      </Card>

      {/* Payout method */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#A855F7]" /> Payout Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
            Payouts are sent in <span className="text-[#A855F7] font-bold">crypto only</span>. Pick a network and paste your wallet address — double-check it, transfers can&apos;t be reversed.
          </p>

          {/* Network picker */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#A855F7]">Network</Label>
            <div className="grid grid-cols-3 gap-2">
              {NETWORKS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  className={cn(
                    "h-10 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all px-1",
                    network === n
                      ? "bg-[#A855F7]/10 border-[#A855F7]/30 text-[#A855F7]"
                      : "bg-white/[0.02] border-white/10 text-neutral-500 hover:text-white"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet address */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#A855F7]">Wallet Address</Label>
            <Input
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
              placeholder="Paste your wallet address"
              className="bg-white/[0.02] border-white/10 h-11 font-mono text-xs"
            />
            <p className="text-[10px] text-neutral-600">
              Make sure the address matches the selected network ({network}).
            </p>
          </div>

          <Button
            onClick={save}
            disabled={saving || !isValid}
            className={cn(
              "w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs",
              isValid ? "bg-[#A855F7] hover:bg-[#A855F7]/90 text-black" : "bg-white/5 text-neutral-600 cursor-not-allowed"
            )}
          >
            {saving ? "Saving..." : "Save Wallet"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs font-bold text-neutral-500">{label}</span>
      <span className={cn("text-sm font-black text-white", mono && "font-mono")}>{value}</span>
    </div>
  );
}
