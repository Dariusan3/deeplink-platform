"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { useTeam } from "@/hooks/use-team";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { useBrainChats, type ChatMessage } from "@/hooks/use-brain-chats";
import { Send, Sparkles, X, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = ChatMessage;

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  // ID of the persisted Brain chat that mirrors this floating session.
  // Null until the first assistant reply completes; then subsequent replies
  // append to the same chat. "Clear" resets it so a fresh session starts a
  // new Brain chat.
  const [brainChatId, setBrainChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { activeTeam } = useTeam();
  const { links } = useLinks();
  const { collections } = useCollections();
  const { dailyClicks, geoData, deviceData, referrerData, topLinks, totalClicks } = useAnalytics("30d");
  const { createChat, updateChat, canCreateChat } = useBrainChats();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const buildContext = useCallback(() => ({
    totalClicks,
    totalLinks: links.length,
    activeLinks: links.filter((l) => l.is_active).length,
    topLinks: topLinks.slice(0, 5),
    topCountries: geoData.slice(0, 3),
    deviceSplit: deviceData,
    topReferrers: referrerData.slice(0, 3),
    dailyTrend: dailyClicks.slice(-7),
    teamName: activeTeam?.name,
    links: links.slice(0, 20).map((l) => ({
      slug: l.slug,
      title: l.title,
      destination: l.destination_url,
      active: l.is_active,
    })),
    collections: collections.map((c) => ({
      name: c.name,
      linkCount: c.link_count || 0,
      clickGoal: c.click_goal,
    })),
  }), [totalClicks, links, topLinks, geoData, deviceData, referrerData, dailyClicks, activeTeam, collections]);

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
    let accumulated = "";

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: newMessages,
          teamId: activeTeam?.id,
          analyticsContext: buildContext(),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

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
            content: "Couldn't connect to AI. Check your API key.",
          };
          return updated;
        });
      }
    } finally {
      setStreaming(false);

      // Persist the exchange as a Brain chat so it shows up in /dashboard/brain.
      // First completed reply creates the chat; subsequent replies update it.
      // Skip on aborts and empty replies. If the team is over the brain-chat
      // limit, silently skip (no toast — this is a background save).
      if (!abortRef.current?.signal.aborted && accumulated) {
        const finalMessages: ChatMessage[] = [
          ...newMessages,
          { role: "assistant", content: accumulated },
        ];

        if (brainChatId) {
          void updateChat(brainChatId, finalMessages);
        } else if (canCreateChat) {
          void createChat().then((newChat) => {
            if (newChat) {
              setBrainChatId(newChat.id);
              updateChat(newChat.id, finalMessages);
            }
          });
        }
      }
    }
  };

  const renderContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/^- (.*)/gm, '<span class="flex gap-1.5"><span class="text-[#00D26A] shrink-0">›</span><span>$1</span></span>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg",
          open
            ? "bg-white/10 border border-white/10 hover:bg-white/15 rotate-0"
            : "bg-[#00D26A] hover:bg-[#00D26A]/90 shadow-[0_0_30px_rgba(0,210,106,0.3)] hover:shadow-[0_0_40px_rgba(0,210,106,0.5)] hover:scale-105 active:scale-95"
        )}
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-black" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[500px] rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Quick AI</p>
                <p className="text-[9px] text-neutral-500">Ask about your stats</p>
              </div>
            </div>
            <button
              onClick={() => {
                abortRef.current?.abort();
                setMessages([]);
                setBrainChatId(null);
              }}
              className="text-[9px] font-black uppercase tracking-widest text-neutral-600 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[350px]">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="w-8 h-8 text-[#00D26A]/30 mx-auto mb-3" />
                <p className="text-xs text-neutral-500 font-medium">
                  Ask anything about your links, clicks, or performance
                </p>
                <div className="mt-4 space-y-1.5">
                  {[
                    "How are my links doing today?",
                    "Which link gets the most clicks?",
                    "Traffic summary",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left text-[11px] text-neutral-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === "user" && "justify-end")}>
                  {msg.role === "assistant" && (
                    <div className="w-5 h-5 rounded-md bg-[#00D26A]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-[#00D26A]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed",
                      msg.role === "user"
                        ? "bg-[#00D26A]/10 border border-[#00D26A]/20 text-white"
                        : "bg-white/5 text-neutral-300"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
                    ) : (
                      msg.content
                    )}
                    {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1 h-3 bg-[#00D26A] ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/5 px-3 py-2.5 flex gap-2 items-center shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about your stats..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 focus:outline-none"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-8 w-8 rounded-lg btn-primary-pulse shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-black" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
