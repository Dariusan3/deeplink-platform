"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { usePartner } from "@/hooks/use-partner";
import { Megaphone, Copy, Check, MessageCircle, Mail, Instagram, Linkedin } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = (link: string) => [
  {
    icon: Instagram,
    label: "Instagram / Facebook caption",
    body: `I've been using Tappr to make my links smarter — geo routing, AI analytics, the works.\n\nIf you're sharing links anywhere (TikTok, IG bio, ads, email), check it out → ${link}\n\n25% off via my partner link 🎯`,
  },
  {
    icon: Linkedin,
    label: "LinkedIn post",
    body: `For anyone running campaigns or distributing content at scale: Tappr is the link platform I've been using.\n\nSmart routing (country / device / time), AI-powered analytics, real-time anomaly alerts. Integrates with Instagram. Has an actual API.\n\nMy partner link: ${link}`,
  },
  {
    icon: MessageCircle,
    label: "DM / WhatsApp",
    body: `hey — i've been using this link platform called Tappr, kinda like Bitly on steroids. Smart routing + AI analytics. Thought you might dig it: ${link}`,
  },
  {
    icon: Mail,
    label: "Email template",
    body: `Hey,\n\nQuick one — I've been using Tappr for link management and the analytics side has been a game-changer (AI insights, real-time anomaly detection, country/device routing).\n\nIf you're managing links for any reason — campaigns, content, internal tools — give it a look:\n${link}\n\nThis is my partner link, so it tracks back if you sign up. Let me know what you think.`,
  },
];

function CopyBlock({ icon: Icon, label, body }: { icon: typeof Instagram; label: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#A855F7]" />
          {label}
        </CardTitle>
        <Button onClick={copy} variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-white/10 bg-white/[0.02] hover:bg-[#A855F7]/10 hover:text-[#A855F7] gap-1.5">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">{body}</pre>
      </CardContent>
    </Card>
  );
}

export default function PartnerPromoPage() {
  const { referralUrl } = usePartner();
  const templates = TEMPLATES(referralUrl);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-20">
      <PageHeader
        accent="purple"
        eyebrow="Partner Dashboard"
        title="Promo Kit"
        subtitle="Copy-paste templates for the platforms you use. All include your partner link automatically."
      />

      <Card className="glass-card border-[#A855F7]/20 bg-[#A855F7]/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-[#A855F7] shrink-0" />
          <div>
            <p className="text-xs font-bold text-white">Customize before you post</p>
            <p className="text-[10px] text-neutral-400">Best results come from your own voice. Treat these as starting points, not scripts.</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {templates.map((t, i) => (
          <CopyBlock key={i} icon={t.icon} label={t.label} body={t.body} />
        ))}
      </div>
    </div>
  );
}
