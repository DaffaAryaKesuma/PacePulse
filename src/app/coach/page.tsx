"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  Send,
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  Loader2,
  MessageSquare,
  Activity,
  Menu,
  X,
  User as UserIcon,
} from "lucide-react";
import { useLanguage, LanguageToggle } from "@/components/LanguageProvider";
import { metersToKm, speedToPace } from "@/lib/formatting";

interface CoachMessageItem {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  createdAt: string;
}

interface CoachActivitySummary {
  id: string;
  name: string;
  startDate: string;
  distanceMeters: number;
  averageSpeed?: number;
  averageHeartrate?: number | null;
  trainingPhase?: string;
}

interface CoachConversationItem {
  id: string;
  title: string;
  activityId: string | null;
  updatedAt: string;
  activity?: CoachActivitySummary | null;
}

interface CoachGetResponse {
  user: {
    id: string;
    fullName: string;
    preferredLanguage: string;
    goalDistance: string | null;
    goalTimeSec: number | null;
    trainingPhase: string;
  };
  conversations: CoachConversationItem[];
  activeConversation: (CoachConversationItem & { messages: CoachMessageItem[] }) | null;
  focusedActivity: CoachActivitySummary | null;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="text-zinc-100 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-white/10 text-emerald-400 text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Markdown table block
    if (trimmed.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const parseRow = (row: string) =>
        row
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());

      const headers = parseRow(tableLines[0]);
      const dataRows = tableLines.slice(2).map(parseRow);

      nodes.push(
        <div
          key={`tbl-${i}`}
          className="my-2 overflow-x-auto rounded-xl border border-white/10 bg-[#09090B]"
        >
          <table className="w-full text-xs font-sans tabular-nums text-left">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900/70 text-zinc-300 font-semibold">
                {headers.map((h, hi) => (
                  <th key={hi} className="py-2 px-3 whitespace-nowrap">
                    {renderInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dataRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1.5 px-3 text-zinc-300 whitespace-nowrap">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      nodes.push(
        <h4
          key={`h-${i}`}
          className="text-sm font-semibold text-emerald-400 mt-3 mb-1 first:mt-0"
        >
          {renderInlineMarkdown(headingMatch[2])}
        </h4>
      );
      i++;
      continue;
    }

    // Bullet lists
    const bulletMatch = trimmed.match(/^[*-]\s+(.*)$/);
    if (bulletMatch) {
      nodes.push(
        <div key={`b-${i}`} className="flex items-start gap-2 pl-1">
          <span className="text-emerald-500 font-bold shrink-0">•</span>
          <span>{renderInlineMarkdown(bulletMatch[1])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
    if (numMatch) {
      nodes.push(
        <div key={`n-${i}`} className="flex items-start gap-2 pl-1">
          <span className="text-zinc-400 font-semibold tabular-nums shrink-0">{numMatch[1]}</span>
          <span>{renderInlineMarkdown(numMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    nodes.push(<p key={`p-${i}`}>{renderInlineMarkdown(trimmed)}</p>);
    i++;
  }

  return <div className="space-y-1.5 text-sm leading-relaxed text-zinc-300">{nodes}</div>;
}

function CoachChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityIdParam = searchParams.get("activityId");
  const promptParam = searchParams.get("prompt");
  const { language, setLanguage, t } = useLanguage();

  const [conversations, setConversations] = useState<CoachConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessageItem[]>([]);
  const [focusedActivity, setFocusedActivity] = useState<CoachActivitySummary | null>(null);
  const [goalLabel, setGoalLabel] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const loadCoachState = useCallback(
    async (convId?: string | null, actId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (convId) params.set("conversationId", convId);
        if (actId) params.set("activityId", actId);
        const res = await fetch(`/api/coach/chat?${params.toString()}`);
        if (res.status === 401) {
          router.push("/?login=required");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CoachGetResponse;

        if (json.user?.preferredLanguage === "id" || json.user?.preferredLanguage === "en") {
          setLanguage(json.user.preferredLanguage);
        }
        setGoalLabel(json.user?.goalDistance || null);
        setConversations(json.conversations ?? []);
        setFocusedActivity(json.activeConversation?.activity ?? json.focusedActivity ?? null);

        if (json.activeConversation) {
          setActiveConvId(json.activeConversation.id);
          setMessages(json.activeConversation.messages ?? []);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load AI Coach");
      } finally {
        setLoading(false);
      }
    },
    [router, setLanguage]
  );

  useEffect(() => {
    void loadCoachState(null, activityIdParam);
  }, [loadCoachState, activityIdParam]);

  useEffect(() => {
    if (promptParam) {
      setInput(promptParam);
    }
  }, [promptParam]);

  const handleSelectConversation = (id: string) => {
    setMobileSidebarOpen(false);
    void loadCoachState(id, null);
  };

  const handleNewConversation = () => {
    setMobileSidebarOpen(false);
    setActiveConvId(null);
    setMessages([]);
    if (activityIdParam) {
      router.replace("/coach");
      setFocusedActivity(null);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/coach/chat?conversationId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConvId === id) {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSend = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    if (!promptText) setInput("");

    const optimisticUserMsg: CoachMessageItem = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const streamingMsgId = `streaming-${Date.now()}`;
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: activeConvId,
          activityId: focusedActivity?.id ?? activityIdParam,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(errJson.details || errJson.error || `HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("Streaming body unavailable");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let streamedContent = "";
      let streamStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() ?? "";

        for (const evt of events) {
          const line = evt
            .split(/\r?\n/)
            .find((l) => l.startsWith("data:"));
          if (!line) continue;

          const payloadStr = line.slice(5).trim();
          if (!payloadStr) continue;

          const eventData = JSON.parse(payloadStr) as {
            type: "meta" | "chunk" | "done" | "error";
            conversationId?: string;
            userMessage?: CoachMessageItem;
            text?: string;
            assistantMessage?: CoachMessageItem;
            error?: string;
          };

          if (eventData.type === "meta") {
            if (eventData.conversationId) {
              setActiveConvId(eventData.conversationId);
            }
            if (eventData.userMessage) {
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== optimisticUserMsg.id),
                eventData.userMessage!,
              ]);
            }
          } else if (eventData.type === "chunk" && eventData.text) {
            streamedContent += eventData.text;
            if (!streamStarted) {
              streamStarted = true;
              setMessages((prev) => [
                ...prev,
                {
                  id: streamingMsgId,
                  role: "assistant",
                  content: streamedContent,
                  createdAt: new Date().toISOString(),
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId ? { ...m, content: streamedContent } : m
                )
              );
            }
          } else if (eventData.type === "done" && eventData.assistantMessage) {
            setMessages((prev) => [
              ...prev.filter((m) => m.id !== streamingMsgId),
              eventData.assistantMessage!,
            ]);
          } else if (eventData.type === "error") {
            throw new Error(eventData.error || "Streaming error");
          }
        }
      }

      // Refresh conversation list in sidebar
      const listRes = await fetch("/api/coach/chat");
      if (listRes.ok) {
        const listJson = (await listRes.json()) as CoachGetResponse;
        setConversations(listJson.conversations ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticUserMsg.id && m.id !== streamingMsgId)
      );
    } finally {
      setSending(false);
    }
  };

  const starterChips = focusedActivity
    ? language === "id"
      ? [
          `Bedah split & cardiac drift pada sesi "${focusedActivity.name}"`,
          "Apakah intensitas sesi ini sudah sesuai zona HR & fase latihan saya?",
          "Apa rekomendasi sesi pemulihan & latihan saya berikutnya?",
        ]
      : [
          `Analyze splits & cardiac drift for "${focusedActivity.name}"`,
          "Did this session match my target HR zones and training phase?",
          "What should my next recovery and key workout look like?",
        ]
    : language === "id"
      ? [
          "Evaluasi kondisi ACWR, VDOT, dan 8 lari terakhir saya",
          "Apakah porsi lari Zona 2 (80/20) saya sudah disiplin?",
          "Bagaimana strategi latihan minggu ini agar target saya tercapai aman?",
        ]
      : [
          "Evaluate my current ACWR, VDOT, and last 8 runs",
          "Am I staying disciplined in Zone 2 (80/20 polarized)?",
          "How should I structure this week to hit my goal safely?",
        ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#09090B] border-r border-white/10">
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 text-xs font-medium">
          <ArrowLeft className="w-4 h-4 text-emerald-500" />
          <span>{t.coachPage.backToDashboard}</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-1 text-zinc-400 hover:text-zinc-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t.coachPage.newChat}</span>
        </button>
      </div>

      <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {t.coachPage.historyTitle}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">
            {t.coachPage.noHistory}
          </div>
        ) : (
          conversations.map((conv) => {
            const active = conv.id === activeConvId;
            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer border text-xs transition-colors ${
                  active
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold"
                    : "border-transparent text-zinc-300 hover:bg-zinc-900/70 hover:text-zinc-100"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-75" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => void handleDeleteConversation(conv.id, e)}
                  title={t.coachPage.deleteChat}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-red-400 transition-opacity shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-medium">PacePulse AI Coach</span>
        <LanguageToggle />
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-full">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
        <header className="border-b border-white/10 bg-[#09090B]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-[#111114] border border-white/10 text-zinc-300"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100 truncate">
                {t.coachPage.title}
              </h1>
              <p className="text-xs text-zinc-400 truncate">
                {t.coachPage.subtitle}
              </p>
            </div>
          </div>

          {goalLabel && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/10 text-xs font-medium text-zinc-200 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              {goalLabel}
            </span>
          )}
        </header>

        {/* Focused Activity Context Banner */}
        {focusedActivity && (
          <div className="px-4 py-2.5 bg-[#111114] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold text-zinc-100 truncate">{focusedActivity.name}</span>
              <span className="text-zinc-400 tabular-nums shrink-0">
                {metersToKm(focusedActivity.distanceMeters)} km
                {focusedActivity.averageSpeed ? ` • ${speedToPace(focusedActivity.averageSpeed)}/km` : ""}
                {focusedActivity.averageHeartrate ? ` • ${Math.round(focusedActivity.averageHeartrate)} bpm` : ""}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-zinc-200 text-[11px] font-medium uppercase tracking-wider">
              {t.coachPage.focusedRunBadge}
            </span>
          </div>
        )}

        {/* Messages Feed (centered max-w-3xl for optimal reading) */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-[#111114] border border-white/10 text-xs text-zinc-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>{t.coachPage.loading}</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-3xl mx-auto py-8 sm:py-14 space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100">
                  {t.coachPage.welcomeTitle}
                </h2>
                <p className="text-sm leading-relaxed text-zinc-400 max-w-lg mx-auto">
                  {t.coachPage.welcomeSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-left pt-2">
                {starterChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSend(chip)}
                    className="p-4 rounded-xl bg-[#111114] border border-white/10 hover:border-white/20 text-sm text-zinc-200 hover:text-zinc-100 transition-colors flex items-center justify-between gap-3"
                  >
                    <span>{chip}</span>
                    <Send className="w-4 h-4 text-emerald-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                const isStreaming = msg.id.startsWith("streaming-");
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 border ${
                        isUser
                          ? "bg-zinc-800/80 border-white/10 text-zinc-100"
                          : "bg-[#111114] border-white/10 text-zinc-300"
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-100">
                          {msg.content}
                        </p>
                      ) : (
                        <>
                          <MarkdownMessage content={msg.content} />
                          {isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-emerald-500 animate-pulse rounded-xs" />
                          )}
                        </>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4 text-zinc-300" />
                      </div>
                    )}
                  </div>
                );
              })}
              {sending && !messages.some((m) => m.id.startsWith("streaming-")) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  </div>
                  <div className="rounded-xl px-4 py-3 bg-[#111114] border border-white/10 text-sm text-zinc-400">
                    {t.coachPage.thinking}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Toast */}
        {error && (
          <div className="px-4 pb-2 max-w-3xl mx-auto w-full">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              {error}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="border-t border-white/10 bg-[#09090B] p-3 sm:p-4 shrink-0"
        >
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={t.coachPage.inputPlaceholder}
              className="flex-1 resize-none bg-[#111114] border border-white/10 focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{t.coachPage.sendBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#09090B] flex items-center justify-center text-zinc-300 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        </div>
      }
    >
      <CoachChatInner />
    </Suspense>
  );
}
