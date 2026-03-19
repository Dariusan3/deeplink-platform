"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { useTeam } from "@/hooks/use-team";
import { useLinks } from "@/hooks/use-links";
import { Send, Sparkles, Zap, TrendingUp, BarChart3, Globe, Cpu, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  { icon: <TrendingUp className="w-4 h-4" />, text: "Which link is performing best and why?" },
  { icon: <Globe className="w-4 h-4" />, text: "What countries drive the most traffic?" },
  { icon: <BarChart3 className="w-4 h-4" />, text: "When should I post for maximum clicks?" },
  { icon: <Zap className="w-4 h-4" />, text: "Detect any anomalies in my traffic" },
  { icon: <Cpu className="w-4 h-4" />, text: "What device types are my audience using?" },
];

export default function BrainPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { activeTeam } = useTeam();
  const { links } = useLinks();
  const { dailyClicks, geoData, deviceData, referrerData, topLinks, totalClicks } = useAnalytics("30d");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildAnalyticsContext = useCallback(() => ({
    totalClicks,
    totalLinks: links.length,
    activeLinks: links.filter((l) => l.is_active).length,
    topLinks: topLinks.slice(0, 5),
    topCountries: geoData.slice(0, 5),
    deviceSplit: deviceData,
    topReferrers: referrerData.slice(0, 5),
    dailyTrend: dailyClicks.slice(-14),
    teamName: activeTeam?.name,
  }), [totalClicks, links, topLinks, geoData, deviceData, referrerData, dailyClicks, activeTeam]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: userText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message
    const assistantIndex = newMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: newMessages,
          teamId: activeTeam?.id,
          analyticsContext: buildAnalyticsContext(),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = {
            role: "assistant",
            content: "Sorry, I couldn't connect to the AI. Make sure your `ANTHROPIC_API_KEY` is set in `.env.local`.",
          };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
  };

  const renderContent = (text: string) => {
    // Very simple markdown — bold, bullet points, headers
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/^### (.*)/gm, '<h3 class="text-sm font-black text-[#00D26A] uppercase tracking-widest mt-4 mb-2">$1</h3>')
      .replace(/^## (.*)/gm, '<h2 class="text-base font-black text-white mt-4 mb-2">$1</h2>')
      .replace(/^- (.*)/gm, '<li class="flex gap-2 text-sm"><span class="text-[#00D26A] shrink-0">›</span><span>$1</span></li>')
      .replace(/(<li.*<\/li>\n?)+/g, '<ul class="space-y-1 my-2">$&</ul>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      <Header title="AI Brain" />
      <div className="flex flex-col h-[calc(100vh-65px)]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#00D26A]" />
            </div>
            <div>
              <p className="text-xs font-black text-white">AI Brain — Analytics Advisor</p>
              <p className="text-[10px] text-neutral-500">Powered by Claude Opus 4.6 · 30-day context loaded</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetConversation}
              className="h-8 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              New Chat
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto space-y-8 pt-8">
              {/* Welcome */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#00D26A]/20 to-[#39FF14]/10 border border-[#00D26A]/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#00D26A]" />
                </div>
                <h2 className="text-2xl font-black text-white">What do you want to know?</h2>
                <p className="text-sm text-neutral-400">
                  Ask anything about your links, traffic patterns, top performers, or audience insights.
                  I have your last 30 days of analytics loaded.
                </p>
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Clicks", value: totalClicks.toLocaleString() },
                  { label: "Active Links", value: links.filter((l) => l.is_active).length },
                  { label: "Countries", value: geoData.length },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card p-4 rounded-xl text-center">
                    <p className="text-xl font-black text-[#00D26A]">{stat.value}</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Suggested prompts */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Suggested Questions</p>
                <div className="grid gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.text}
                      onClick={() => sendMessage(prompt.text)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#00D26A]/5 hover:border-[#00D26A]/20 text-left text-sm text-neutral-300 hover:text-white transition-all group"
                    >
                      <span className="text-[#00D26A] shrink-0">{prompt.icon}</span>
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#00D26A]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-[#00D26A]/10 border border-[#00D26A]/20 text-white"
                        : "glass-card text-neutral-300"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                      />
                    ) : (
                      msg.content
                    )}
                    {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-4 bg-[#00D26A] ml-1 animate-pulse rounded-sm" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/5 px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your links, traffic, or audience..."
                rows={1}
                className="w-full resize-none bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/30 focus:ring-1 focus:ring-[#00D26A]/20 transition-all"
                style={{ maxHeight: "120px" }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                }}
              />
            </div>
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="h-11 w-11 p-0 rounded-xl btn-primary-pulse shrink-0"
            >
              <Send className="w-4 h-4 text-black" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-neutral-600 mt-2 max-w-3xl mx-auto">
            Press Enter to send · Shift+Enter for new line · AI responses are based on your actual analytics data
          </p>
        </div>
      </div>
    </>
  );
}
