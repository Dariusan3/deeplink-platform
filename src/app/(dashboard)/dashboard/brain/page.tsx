"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { useTeam } from "@/hooks/use-team";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { useBusinessBrain } from "@/hooks/use-business-brain";
import {
  Send,
  Sparkles,
  Zap,
  TrendingUp,
  BarChart3,
  Globe,
  Cpu,
  RotateCcw,
  FolderOpen,
  Target,
  BookOpen,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  { icon: <TrendingUp className="w-4 h-4" />, text: "Which link is performing best and why?" },
  { icon: <FolderOpen className="w-4 h-4" />, text: "Compare my collections — which one gets the most clicks?" },
  { icon: <Globe className="w-4 h-4" />, text: "What countries drive the most traffic?" },
  { icon: <Target className="w-4 h-4" />, text: "Am I on track to hit my click goals?" },
  { icon: <BookOpen className="w-4 h-4" />, text: "Based on my business context, what should I improve?" },
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

  // Knowledge panel state
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const { activeTeam } = useTeam();
  const { links } = useLinks();
  const { collections } = useCollections();
  const { dailyClicks, geoData, deviceData, referrerData, topLinks, totalClicks } = useAnalytics("30d");
  const { entries, addEntry, updateEntry, deleteEntry, buildBusinessContext } = useBusinessBrain();

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
    links: links.map((l) => ({
      slug: l.slug,
      title: l.title,
      destination: l.destination_url,
      active: l.is_active,
      collectionId: l.collection_id,
      clickGoal: l.click_goal,
      clickGoalPeriod: l.click_goal_period,
      createdAt: l.created_at,
    })),
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      linkCount: c.link_count || 0,
      clickGoal: c.click_goal,
      clickGoalPeriod: c.click_goal_period,
    })),
    businessContext: buildBusinessContext(),
  }), [totalClicks, links, topLinks, geoData, deviceData, referrerData, dailyClicks, activeTeam, collections, buildBusinessContext]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: userText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

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
            content: "Sorry, I couldn't connect to the AI. Make sure your API key is set.",
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

  const handleAddEntry = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await addEntry(newTitle.trim(), newContent.trim());
    setNewTitle("");
    setNewContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    await updateEntry(editingId, editTitle.trim(), editContent.trim());
    setEditingId(null);
  };

  const startEdit = (entry: { id: string; title: string | null; content: unknown }) => {
    setEditingId(entry.id);
    setEditTitle(entry.title || "");
    const text = typeof entry.content === "object" && entry.content !== null && "text" in (entry.content as Record<string, unknown>)
      ? (entry.content as { text: string }).text
      : "";
    setEditContent(text);
  };

  const renderContent = (text: string) => {
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
      <div className="flex h-[calc(100vh-65px)]">
        {/* Knowledge sidebar */}
        <div
          className={cn(
            "border-r border-white/5 bg-black/50 flex flex-col transition-all duration-300 shrink-0 overflow-hidden",
            knowledgeOpen ? "w-80" : "w-0"
          )}
        >
          {knowledgeOpen && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00D26A]" />
                  <span className="text-xs font-black text-white uppercase tracking-widest">
                    Business Knowledge
                  </span>
                </div>
                <button
                  onClick={() => setKnowledgeOpen(false)}
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Add new entry */}
              <div className="p-3 border-b border-white/5 space-y-2 shrink-0">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title (e.g. Target Audience)"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50"
                />
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Details about your business, products, audience, goals..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50 resize-none"
                />
                <Button
                  onClick={handleAddEntry}
                  disabled={!newTitle.trim() || !newContent.trim()}
                  size="sm"
                  className="w-full h-8 btn-primary-pulse text-black font-black uppercase text-[9px] tracking-widest rounded-lg"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Knowledge
                </Button>
              </div>

              {/* Entries list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {entries.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                    <p className="text-[10px] text-neutral-600 font-medium">
                      Add info about your business so the AI can give better advice
                    </p>
                  </div>
                ) : (
                  entries.map((entry) => {
                    const text = typeof entry.content === "object" && entry.content !== null && "text" in (entry.content as Record<string, unknown>)
                      ? (entry.content as { text: string }).text
                      : "";

                    if (editingId === entry.id) {
                      return (
                        <div key={entry.id} className="p-3 rounded-xl border border-[#00D26A]/20 bg-[#00D26A]/5 space-y-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00D26A]/50"
                          />
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#00D26A]/50 resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-7 text-[9px] btn-primary-pulse text-black font-black uppercase tracking-widest rounded-md flex-1"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              className="h-7 text-[9px] text-neutral-500 hover:text-white"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group cursor-pointer"
                        onClick={() => startEdit(entry)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-black text-white truncate">
                            {entry.title || "Untitled"}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEntry(entry.id);
                            }}
                            className="text-neutral-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-1 line-clamp-3 leading-relaxed">
                          {text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              {/* Knowledge toggle */}
              <button
                onClick={() => setKnowledgeOpen(!knowledgeOpen)}
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                  knowledgeOpen
                    ? "bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]"
                    : "bg-white/5 border border-white/10 text-neutral-500 hover:text-white hover:bg-white/10"
                )}
                title="Business Knowledge"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              <div className="w-8 h-8 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-xs font-black text-white">AI Brain — Analytics &amp; Business Advisor</p>
                <p className="text-[10px] text-neutral-500">
                  {entries.length > 0
                    ? `${entries.length} knowledge entries · Links, collections & analytics loaded`
                    : "Links, collections & analytics loaded"}
                </p>
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
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#00D26A]/20 to-[#39FF14]/10 border border-[#00D26A]/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-[#00D26A]" />
                  </div>
                  <h2 className="text-2xl font-black text-white">What do you want to know?</h2>
                  <p className="text-sm text-neutral-400">
                    Ask about your links, collections, traffic, or business strategy.
                    {entries.length === 0 && (
                      <> Click the <BookOpen className="w-3.5 h-3.5 inline-block mx-1 text-[#00D26A]" /> button to add business context for smarter advice.</>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Clicks", value: totalClicks.toLocaleString() },
                    { label: "Active Links", value: links.filter((l) => l.is_active).length },
                    { label: "Collections", value: collections.length },
                    { label: "Knowledge", value: entries.length },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-card p-4 rounded-xl text-center">
                      <p className="text-xl font-black text-[#00D26A]">{stat.value}</p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

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
                        <div dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
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
          <div className="border-t border-white/5 px-6 py-4 shrink-0">
            <div className="max-w-3xl mx-auto flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your links, traffic, business, or audience..."
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
              Press Enter to send · Shift+Enter for new line · AI uses your analytics + business knowledge
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
