"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { usePartner } from "@/hooks/use-partner";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Site / blog", "Facebook", "LinkedIn"];
const FORMATS = ["Reels / video scurt", "Carusel", "Story-uri", "Postare / articol", "Mesaj privat", "Email"];
const TONES = ["direct", "educativ", "amuzant", "serios"];

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 focus:border-[#A855F7] focus:outline-none text-sm text-white placeholder:text-neutral-500";
const labelCls = "block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5";

export default function PartnerContentIdeasPage() {
  const { referralUrl } = usePartner();
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, format, tone, niche, audience, link: referralUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Generarea a eșuat");
        return;
      }
      setIdeas(json.ideas);
    } catch {
      toast.error("Generarea a eșuat");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(ideas);
    setCopied(true);
    toast.success("Copiat");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div lang="ro" translate="no" className="p-4 md:p-6 space-y-6 pb-20">
      <PageHeader
        accent="purple"
        eyebrow="Partner Dashboard"
        title="Content Ideas"
        subtitle="Spune-ne unde postezi și cui te adresezi. AI-ul îți scrie 5 idei gata de folosit, cu link-ul tău inclus."
      />

      <Card className="glass-card border-white/5">
        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Platformă</label>
              <select className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <option key={p} value={p} className="bg-neutral-900">{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Format</label>
              <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS.map((f) => <option key={f} value={f} className="bg-neutral-900">{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ton</label>
              <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t} value={t} className="bg-neutral-900">{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nișa ta</label>
              <input className={inputCls} value={niche} maxLength={200} onChange={(e) => setNiche(e.target.value)} placeholder="ex. marketing pentru restaurante" />
            </div>
            <div>
              <label className={labelCls}>Cine te urmărește</label>
              <input className={inputCls} value={audience} maxLength={200} onChange={(e) => setAudience(e.target.value)} placeholder="ex. antreprenori, 25-40 ani, România" />
            </div>
          </div>
          <Button
            onClick={generate}
            disabled={loading}
            className="bg-[#A855F7] hover:bg-[#A855F7]/90 text-black font-black uppercase text-[11px] tracking-widest h-10 px-5 gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{loading ? "Generez..." : ideas ? "Generează alte idei" : "Generează idei"}</span>
          </Button>
        </CardContent>
      </Card>

      {ideas && (
        <Card className="glass-card border-[#A855F7]/20">
          <CardContent className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-[#A855F7]">Ideile tale</p>
              <Button onClick={copy} variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-white/10 bg-white/[0.02] hover:bg-[#A855F7]/10 hover:text-[#A855F7] gap-1.5">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copiat" : "Copiază tot"}</span>
              </Button>
            </div>
            <pre className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed font-sans">{ideas}</pre>
            <p className="text-[10px] text-neutral-500">Adaptează cu vocea ta înainte să postezi și menționează că e link de partener.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
