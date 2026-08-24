"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePartner } from "@/hooks/use-partner";
import { getDisplayOrigin } from "@/lib/url-normalize";
import { validateVanityCode, CODE_MAX } from "@/lib/partner-codes";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// The referral-code editor on its own, so Settings and the Overview card drive
// the same control instead of each growing its own copy. Only the surrounding
// chrome differs: Settings frames it in a Card, Overview reveals it under the
// link when you press Edit.

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "free" }
  | { state: "taken"; reason: string };

export function VanityCodeEditor({ onSaved }: { onSaved?: () => void }) {
  const { codes, primaryCode, setVanityCode } = usePartner();
  const [draft, setDraft] = useState("");
  const [availability, setAvailability] = useState<Availability>({ state: "idle" });
  const [saving, setSaving] = useState(false);

  const origin = getDisplayOrigin().replace(/^https?:\/\//, "");
  const unchanged = draft === "" || draft === primaryCode;

  // Debounced availability probe. This is a convenience only — uniqueness is
  // enforced by the partner_codes primary key when the code is actually set,
  // so two partners racing on the same code still cannot both get it.
  useEffect(() => {
    if (unchanged) {
      setAvailability({ state: "idle" });
      return;
    }
    const local = validateVanityCode(draft);
    if (!local.ok) {
      setAvailability({ state: "taken", reason: local.reason });
      return;
    }

    setAvailability({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/partner/vanity-code/available?code=${encodeURIComponent(local.code)}`
        );
        const data = await res.json();
        setAvailability(
          data.available
            ? { state: "free" }
            : { state: "taken", reason: data.reason || "That code is already taken." }
        );
      } catch {
        // A failed probe must not block the save — the server decides anyway.
        setAvailability({ state: "idle" });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [draft, unchanged]);

  const save = async () => {
    setSaving(true);
    try {
      await setVanityCode(draft);
      setDraft("");
      setAvailability({ state: "idle" });
      onSaved?.();
    } catch {
      // usePartner already surfaced the reason as a toast.
    } finally {
      setSaving(false);
    }
  };

  const canSave = !unchanged && availability.state === "free" && !saving;
  const others = codes.filter((c) => !c.is_primary);

  return (
    <div className="space-y-4">
      <div className="flex items-stretch rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden focus-within:border-[#A855F7]/40 transition-colors">
        <span className="flex items-center pl-3 pr-1 font-mono text-xs text-neutral-500 shrink-0 select-none">
          {origin}/signup/
        </span>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value.toLowerCase().trim())}
          placeholder={primaryCode}
          maxLength={CODE_MAX}
          aria-label="Custom referral code"
          className="flex-1 min-w-0 h-11 border-0 bg-transparent font-mono text-xs px-1 focus-visible:ring-0"
        />
        <span className="flex items-center pr-3 shrink-0">
          {availability.state === "checking" && (
            <Loader2 className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
          )}
          {availability.state === "free" && <Check className="w-3.5 h-3.5 text-[#A855F7]" />}
          {availability.state === "taken" && <X className="w-3.5 h-3.5 text-red-400" />}
        </span>
      </div>

      {availability.state === "taken" && (
        <p className="text-[11px] text-red-400 font-medium">{availability.reason}</p>
      )}

      <Button
        onClick={save}
        disabled={!canSave}
        className={cn(
          "w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs",
          canSave
            ? "bg-[#A855F7] hover:bg-[#A855F7]/90 text-black"
            : "bg-white/5 text-neutral-600 cursor-not-allowed"
        )}
      >
        {saving ? "Saving..." : "Save Link"}
      </Button>

      {others.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
            Your older codes — still working
          </p>
          <div className="flex flex-wrap gap-1.5">
            {others.map((c) => (
              <span
                key={c.code}
                className="font-mono text-[11px] text-neutral-400 bg-white/[0.03] border border-white/10 rounded px-2 py-1"
              >
                /{c.code}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
