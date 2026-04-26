"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePartner } from "@/hooks/use-partner";
import { Wallet, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Method = "paypal" | "bank";

export default function PartnerSettingsPage() {
  const { profile, updatePayoutMethod } = usePartner();
  const [method, setMethod] = useState<Method>("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [saving, setSaving] = useState(false);

  // Hydrate from server-saved value
  useEffect(() => {
    if (!profile?.payout_method) return;
    const m = profile.payout_method;
    setMethod(m.type === "bank" ? "bank" : "paypal");
    setPaypalEmail(m.email || "");
    setIban(m.iban || "");
    setAccountHolder(m.account_holder || "");
  }, [profile?.payout_method]);

  const isValid =
    method === "paypal"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.trim())
      : iban.trim().length >= 15 && accountHolder.trim().length > 0;

  const save = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await updatePayoutMethod(
        method === "paypal"
          ? { type: "paypal", email: paypalEmail.trim() }
          : { type: "bank", iban: iban.trim(), account_holder: accountHolder.trim() }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto pb-20">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">Partner Dashboard</p>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Settings</h1>
      </div>

      {/* Account info */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-[#00D26A]" /> Partner Account
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
            <Wallet className="w-4 h-4 text-[#00D26A]" /> Payout Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("paypal")}
              className={cn(
                "h-11 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                method === "paypal"
                  ? "bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]"
                  : "bg-white/[0.02] border-white/10 text-neutral-500 hover:text-white"
              )}
            >
              PayPal
            </button>
            <button
              onClick={() => setMethod("bank")}
              className={cn(
                "h-11 rounded-xl border text-xs font-black uppercase tracking-widest transition-all",
                method === "bank"
                  ? "bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]"
                  : "bg-white/[0.02] border-white/10 text-neutral-500 hover:text-white"
              )}
            >
              Bank Transfer
            </button>
          </div>

          {method === "paypal" ? (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">PayPal Email</Label>
              <Input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/[0.02] border-white/10 h-11"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">IBAN</Label>
                <Input
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="RO49AAAA1B31007593840000"
                  className="bg-white/[0.02] border-white/10 h-11 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">Account Holder</Label>
                <Input
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Full legal name"
                  className="bg-white/[0.02] border-white/10 h-11"
                />
              </div>
            </>
          )}

          <Button
            onClick={save}
            disabled={saving || !isValid}
            className={cn(
              "w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs",
              isValid ? "bg-[#00D26A] hover:bg-[#00D26A]/90 text-black" : "bg-white/5 text-neutral-600 cursor-not-allowed"
            )}
          >
            {saving ? "Saving..." : "Save Payment Method"}
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
