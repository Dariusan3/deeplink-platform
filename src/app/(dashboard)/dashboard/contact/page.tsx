"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { Headphones, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const { user, profile } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Prefill name + email from the signed-in profile once it loads.
  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name);
    if (!name && user?.user_metadata?.full_name) setName(user.user_metadata.full_name);
    if (!email && (profile?.email || user?.email)) {
      setEmail(profile?.email || user?.email || "");
    }
  // Intentionally omit state setters from deps; we only want to prefill once
  // per identity change, not overwrite a user-edited value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.full_name, profile?.email, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Name, email and message are required.");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Please write at least a short sentence (10+ chars).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, honeypot }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }
      toast.success("Message sent! We'll reply within 1–2 business days.");
      setSent(true);
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Header title="Contact Support" />

      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Intro card */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20">
                <Headphones className="w-5 h-5 text-[#00D26A]" />
              </div>
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-400">
              Got a question, bug report, or feature request? Drop us a message — we
              usually reply within 1–2 business days.
            </p>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="glass-card border-white/5">
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#00D26A]" />
                </div>
                <h2 className="text-lg font-black text-white">Message sent</h2>
                <p className="text-sm text-neutral-400 max-w-sm mx-auto">
                  Thanks for reaching out. We&apos;ll get back to you at <span className="text-white font-bold">{email}</span>.
                </p>
                <Button
                  onClick={() => setSent(false)}
                  variant="ghost"
                  className="text-[10px] font-black uppercase tracking-widest text-[#00D26A] hover:bg-[#00D26A]/10"
                >
                  Send Another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                      Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                      Email <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                    Subject
                  </Label>
                  <Input
                    placeholder="Short summary"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-white/[0.03] border-white/10 focus:border-[#00D26A]/50 rounded-xl h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                    Message <span className="text-red-400">*</span>
                  </Label>
                  <textarea
                    placeholder="Tell us what's going on…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    className="w-full resize-y bg-white/[0.03] border border-white/10 focus:border-[#00D26A]/50 rounded-xl px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all"
                    required
                    minLength={10}
                    maxLength={5000}
                  />
                  <p className="text-[9px] text-neutral-600 text-right">
                    {message.length}/5000
                  </p>
                </div>

                {/* Honeypot: hidden from users, bots fill it. */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] w-px h-px opacity-0"
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full h-12 rounded-xl btn-primary-pulse text-black font-black uppercase tracking-widest text-xs",
                    loading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {loading ? "Sending..." : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
