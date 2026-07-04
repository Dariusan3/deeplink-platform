"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAnalytics } from "@/hooks/use-analytics";
import { useTeam } from "@/hooks/use-team";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { useBusinessBrain } from "@/hooks/use-business-brain";
import { useBrainChats, type ChatMessage } from "@/hooks/use-brain-chats";
import { dispatchAiAction } from "@/lib/ai-action-bus";
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
  ChevronRight,
  Save,
  MessageSquare,
  PenSquare,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// Display-only state: each message can carry tool actions taken by the AI.
// Persistence keeps only text content — actions are runtime side-effects
// surfaced as inline cards.
type ActionEvent = {
  name: string;
  args: unknown;
  result: { ok: boolean; data?: unknown; error?: string; summary?: string };
};
type DisplayMessage = ChatMessage & { actions?: ActionEvent[] };

export default function BrainPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
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

  // Delete confirmation
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const { activeTeam } = useTeam();
  const { links } = useLinks();
  const { collections } = useCollections();
  const { dailyClicks, geoData, deviceData, referrerData, topLinks, totalClicks } = useAnalytics("30d");
  const { entries, addEntry, updateEntry, deleteEntry, buildBusinessContext } = useBusinessBrain();
  const {
    chats,
    loading: chatsLoading,
    activeChatId,
    setActiveChatId,
    createChat,
    updateChat,
    deleteChat,
    canCreateChat,
    chatLimit,
  } = useBrainChats();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when switching to a different chat.
  // Only overwrite state if the stored chat has messages — newly created chats
  // start with messages:[] and would otherwise wipe the active conversation.
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const chat = chats.find((c) => c.id === activeChatId);
    if (chat) {
      const stored = (chat.messages as unknown as ChatMessage[]) ?? [];
      if (stored.length > 0) {
        setMessages(stored);
      }
    }
  }, [activeChatId, chats]);

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
      id: l.id,
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

    const userMessage: ChatMessage = { role: "user", content: userText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const assistantIndex = newMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    // Typewriter buffer — Groq sometimes returns big chunks (300+ chars at
    // once). Without smoothing, the message appears in jumps. We keep the
    // full server text in `target`, and a separate rAF loop advances the
    // visible `displayed` toward it at ~120 chars/sec, scaling up if the
    // backlog gets large so long answers don't feel sluggish.
    let target = "";
    let displayed = "";
    let rafId: number | null = null;
    let streamDone = false;
    let lastTickTime = performance.now();
    const collectedActions: ActionEvent[] = [];

    const writeMessage = (text: string) => {
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = {
          role: "assistant",
          content: text,
          actions: collectedActions.slice(),
        };
        return next;
      });
    };

    // When an action arrives mid-stream:
    //   1. push it into the message's action list (UI card renders)
    //   2. broadcast on the refresh bus so any open list page (links,
    //      collections, sidebar Favorites) updates without a refresh
    const pushAction = (action: ActionEvent) => {
      collectedActions.push(action);
      writeMessage(displayed);
      dispatchAiAction({
        name: action.name,
        args:
          action.args && typeof action.args === "object"
            ? (action.args as Record<string, unknown>)
            : {},
        result: action.result,
      });
    };

    const tick = (now: number) => {
      const dt = (now - lastTickTime) / 1000;
      lastTickTime = now;
      const gap = target.length - displayed.length;

      if (gap > 0) {
        // 120 c/s baseline; speed up when the gap is wide so big chunks
        // catch up gracefully without leaving the user waiting.
        const baseRate = 120;
        const catchUp = gap > 80 ? gap * 1.2 : 0;
        const advance = Math.max(1, Math.ceil((baseRate + catchUp) * dt));
        displayed = target.slice(0, displayed.length + advance);
        writeMessage(displayed);
      }

      if (!streamDone || displayed.length < target.length) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

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

      // Start the typewriter once we know the request succeeded.
      lastTickTime = performance.now();
      rafId = requestAnimationFrame(tick);

      // NDJSON parser — server sends one JSON object per line. We buffer
      // partial lines across chunk boundaries.
      let buffer = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Last fragment may be incomplete — keep it in the buffer.
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as
              | { type: "text"; value: string }
              | ({ type: "action" } & ActionEvent);
            if (evt.type === "text") {
              target += evt.value;
            } else if (evt.type === "action") {
              const { name, args, result } = evt as ActionEvent & { type: "action" };
              pushAction({ name, args, result });
            }
          } catch {
            // Malformed line — skip rather than break the stream
          }
        }
      }
      // Flush any trailing partial line if it's complete JSON.
      if (buffer.trim()) {
        try {
          const evt = JSON.parse(buffer) as { type: "text"; value: string };
          if (evt.type === "text") target += evt.value;
        } catch { /* drop */ }
      }
      streamDone = true;
    } catch (err: unknown) {
      streamDone = true;
      if (err instanceof Error && err.name !== "AbortError") {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        target = "Sorry, I couldn't connect to the AI. Make sure your API key is set.";
        writeMessage(target);
        displayed = target;
      }
    } finally {
      // Wait for the typewriter to finish draining before flipping streaming
      // off — otherwise the cursor disappears mid-cascade.
      const drain = () =>
        new Promise<void>((resolve) => {
          const check = () => {
            if (rafId === null) resolve();
            else setTimeout(check, 50);
          };
          check();
        });
      await drain();

      setStreaming(false);

      // Auto-save chat after streaming completes (skip if aborted)
      if (!abortRef.current?.signal.aborted && target) {
        const finalMessages: ChatMessage[] = [
          ...newMessages,
          { role: "assistant", content: target },
        ];

        if (activeChatId) {
          void updateChat(activeChatId, finalMessages);
        } else if (canCreateChat) {
          void createChat().then((newChat) => {
            if (newChat) updateChat(newChat.id, finalMessages);
          });
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
    setActiveChatId(null);
  }, [setActiveChatId]);

  const handleSelectChat = (id: string) => {
    if (streaming) return; // prevent switching mid-stream
    setActiveChatId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingChatId) return;
    await deleteChat(deletingChatId);
    setDeletingChatId(null);
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

  // Markdown → HTML for assistant messages. Output is wrapped in
  // `.brain-prose` (see globals.css) for typography. We escape user-visible
  // HTML before applying markdown, so model output can't smuggle markup.
  const renderContent = (text: string) => {
    const escape = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let html = escape(text);

    // Code blocks (```lang\ncode``` or ```code```) — handle first so their
    // contents aren't touched by inline rules below.
    const codeBlocks: string[] = [];
    html = html.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, code) => {
      const i = codeBlocks.push(code) - 1;
      return `\x00CODEBLOCK${i}\x00`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bold + italic
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

    // Headings
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bullet + numbered lists
    html = html.replace(/^[-*] (.+)$/gm, "\x01UL$1");
    html = html.replace(/(\x01UL[^\n]+(?:\n\x01UL[^\n]+)*)/g, (block) => {
      const items = block
        .split(/\n/)
        .map((line) => line.replace(/^\x01UL/, "").trim())
        .filter(Boolean)
        .map((item) => `<li>${item}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    });
    html = html.replace(/^\d+\. (.+)$/gm, "\x02OL$1");
    html = html.replace(/(\x02OL[^\n]+(?:\n\x02OL[^\n]+)*)/g, (block) => {
      const items = block
        .split(/\n/)
        .map((line) => line.replace(/^\x02OL/, "").trim())
        .filter(Boolean)
        .map((item) => `<li>${item}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    });

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

    // Links — markdown `[text](url)`
    html = html.replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );

    // Paragraphs — split on blank lines, wrap in <p>
    const blocks = html.split(/\n{2,}/).map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Don't wrap if it's already a block-level element.
      if (/^<(h\d|ul|ol|blockquote|pre|\x00CODEBLOCK)/.test(trimmed)) {
        return trimmed;
      }
      // Inside a paragraph, single newline = soft break.
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    });
    html = blocks.join("");

    // Restore code blocks last so their <pre><code> escapes aren't double-mangled.
    html = html.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, i) => {
      return `<pre><code>${codeBlocks[Number(i)]}</code></pre>`;
    });

    return html;
  };

  const showLimitBadge = chatLimit !== Infinity && chats.length >= chatLimit * 0.8;

  return (
    <TooltipProvider>
      <>
        <Header title="AI Brain" />
        <div className="flex h-[calc(100vh-65px)]">

          {/* LEFT: Chat History Sidebar */}
          <div className="w-56 shrink-0 border-r border-white/5 bg-black/50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#00D26A]" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Chats</span>
              </div>
              <Tooltip>
                <TooltipTrigger
                  onClick={handleNewChat}
                  disabled={!canCreateChat}
                  className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-[#00D26A]/10 hover:border-[#00D26A]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <PenSquare className="w-3 h-3" />
                </TooltipTrigger>
                {!canCreateChat && (
                  <TooltipContent side="right" className="text-[10px]">
                    Limit reached ({chats.length}/{chatLimit}). Upgrade to save more.
                  </TooltipContent>
                )}
              </Tooltip>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-0.5">
              {chatsLoading ? (
                <div className="space-y-1.5 p-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <MessageSquare className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
                  <p className="text-[10px] text-neutral-600 leading-relaxed">
                    Your chats will appear here after you send your first message.
                  </p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={cn(
                      "group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all",
                      chat.id === activeChatId
                        ? "bg-[#00D26A]/5 border border-[#00D26A]/20"
                        : "hover:bg-white/[0.04] border border-transparent",
                      streaming && chat.id !== activeChatId && "pointer-events-none opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className={cn(
                        "w-3 h-3 shrink-0",
                        chat.id === activeChatId ? "text-[#00D26A]" : "text-neutral-600"
                      )} />
                      <span className="text-[11px] text-neutral-300 truncate">
                        {chat.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingChatId(chat.id); }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-500 transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Plan limit badge */}
            {showLimitBadge && (
              <div className="px-3 py-2.5 border-t border-white/5 shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Chats Used</span>
                  <span className={cn(
                    "text-[9px] font-black",
                    chats.length >= chatLimit ? "text-red-400" : "text-amber-400"
                  )}>
                    {chats.length}/{chatLimit}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      chats.length >= chatLimit ? "bg-red-500" : "bg-amber-400"
                    )}
                    style={{ width: `${Math.min((chats.length / chatLimit) * 100, 100)}%` }}
                  />
                </div>
                {chats.length >= chatLimit && (
                  <p className="text-[9px] text-neutral-600 mt-1.5">
                    <a href="/pricing" className="text-[#00D26A] hover:underline">Upgrade</a> to save more chats
                  </p>
                )}
              </div>
            )}
          </div>

          {/* CENTER: Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2">
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

                <Tooltip>
                  <TooltipTrigger
                    onClick={handleNewChat}
                    disabled={!canCreateChat}
                    className="h-8 px-3 inline-flex items-center gap-2 rounded-md text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    New Chat
                  </TooltipTrigger>
                  {!canCreateChat && (
                    <TooltipContent side="bottom" className="text-[10px]">
                      Limit reached ({chats.length}/{chatLimit}). Upgrade to save more.
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-6 space-y-6">
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
                          "max-w-[80%] rounded-2xl px-5 py-4",
                          msg.role === "user"
                            ? "bg-[#00D26A]/10 border border-[#00D26A]/20 text-white text-[15px] leading-[1.6]"
                            : "glass-card"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <div className="brain-prose">
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="not-prose mb-3 space-y-2">
                                {msg.actions.map((a, idx) => (
                                  <ActionCard key={idx} action={a} />
                                ))}
                              </div>
                            )}
                            <span dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
                            {streaming && i === messages.length - 1 && (
                              <span className="brain-cursor" />
                            )}
                          </div>
                        ) : (
                          msg.content
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
                Press Enter to send · Shift+Enter for new line · Responses are AI-generated (Groq) and may be inaccurate
              </p>
            </div>
          </div>

          {/* RIGHT: Knowledge panel (collapsible) */}
          <div
            className={cn(
              "border-l border-white/5 bg-black/50 flex flex-col transition-all duration-300 shrink-0 overflow-hidden",
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
                    <ChevronRight className="w-4 h-4" />
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
                <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-2">
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
        </div>

        {/* Delete chat confirmation dialog */}
        <Dialog open={!!deletingChatId} onOpenChange={(open) => !open && setDeletingChatId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Chat</DialogTitle>
              <DialogDescription>
                This chat and all its messages will be permanently deleted. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingChatId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white font-black"
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}

// Action card — surfaces every tool call the AI made, with its result.
// Green border when the action succeeded, red when it failed. The
// summary line comes from the tool itself; we render args inline as a
// hint so the user can verify what was actually done.
function ActionCard({ action }: { action: { name: string; args: unknown; result: { ok: boolean; data?: unknown; error?: string; summary?: string } } }) {
  const { name, args, result } = action;
  const ok = result.ok;
  const label = ACTION_LABELS[name] || name;

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-xs ${
        ok
          ? "border-[#00D26A]/25 bg-[#00D26A]/[0.04]"
          : "border-red-500/30 bg-red-500/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded ${
            ok ? "bg-[#00D26A]/10 text-[#00D26A]" : "bg-red-500/10 text-red-400"
          }`}
        >
          {ok ? <><Check className="w-3 h-3" /> Action</> : <><X className="w-3 h-3" /> Failed</>}
        </span>
        <span className="text-neutral-300 font-bold">{label}</span>
      </div>
      <p className={ok ? "text-neutral-300" : "text-red-300"}>
        {ok ? result.summary || "Done." : result.error || "Tool execution failed."}
      </p>
      {ok && args && typeof args === "object" && Object.keys(args).length > 0 ? (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[10px] text-neutral-500 hover:text-neutral-300">
            Show details
          </summary>
          <pre className="mt-1 p-2 rounded bg-black/40 text-[10px] text-neutral-400 font-mono overflow-x-auto">
{JSON.stringify(args, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  list_links: "Listed links",
  list_collections: "Listed collections",
  create_link: "Created link",
  create_collection: "Created collection",
  move_link_to_collection: "Moved link",
  update_link: "Updated link",
  toggle_link_favorite: "Toggled favorite",
};
