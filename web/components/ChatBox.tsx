"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "./ChatMarkdown";
import { EvidenceCardView } from "./EvidenceCard";
import type { EvidenceCard } from "@/lib/types";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  evidenceCard?: EvidenceCard;
  mode?: "ai" | "mcp-only";
};

const STARTER_PROMPTS = [
  "What's the strongest stat for a 2-minute pitch?",
  "Why does Bexley decide so many apps on the deadline?",
  "Compare Lambeth's deprivation to its approval rate",
  "How much officer time goes to repeat applications?",
];

type Props = {
  onMcpCall?: () => void;
  initialPrompt?: string;
};

export function ChatBox({ onMcpCall, initialPrompt }: Props) {
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask anything about London planning data. I'll pull live MCP stats, then answer in a natural back-and-forth — try follow-ups like \"what about Bexley?\" or \"help me tighten that for a pitch\".",
      mode: "ai",
    },
  ]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [latestCard, setLatestCard] = useState<EvidenceCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const gptActive = messages.some((m) => m.mode === "ai");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || loading) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const history = [...messages.filter((m) => m.id !== "welcome"), userTurn];
    setMessages((m) => [...m.filter((x) => x.id !== "welcome"), userTurn]);
    setInput("");
    setLoading(true);
    setNotice(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error ?? "Chat failed");

      onMcpCall?.();

      const assistantTurn: ChatTurn = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        toolsUsed: data.toolsUsed,
        evidenceCard: data.evidenceCard,
        mode: data.mode,
      };

      setMessages((m) => [...m, assistantTurn]);
      if (data.evidenceCard) setLatestCard(data.evidenceCard);
      if (data.notice) setNotice(data.notice);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-5 flex flex-col min-h-[640px] h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="section-label">Chat</p>
          <h2 className="title-serif text-xl mt-1">Ask the data</h2>
          <p className="text-xs text-[var(--muted)] mt-1.5">
            GPT + live MCP · multi-turn conversation
          </p>
        </div>
        {gptActive ? (
          <span className="badge badge-live">GPT + MCP</span>
        ) : (
          <span className="badge">MCP only</span>
        )}
      </div>

      <div ref={scrollRef} className="chat-messages space-y-4 mb-4 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "bubble-user text-sm" : "bubble-assistant text-sm"}
          >
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
              {m.role === "user" ? "You" : "Analyst"}
              {m.toolsUsed?.length ? (
                <span className="ml-2 font-mono normal-case tracking-normal">
                  {m.toolsUsed.join(", ")}
                </span>
              ) : null}
            </p>
            <div className="text-[var(--text)]">
              {m.role === "assistant" ? (
                <ChatMarkdown text={m.content} />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading ? (
          <p className="text-xs text-[var(--muted)] animate-pulse ml-2 tracking-wide">
            Fetching MCP data, drafting reply…
          </p>
        ) : null}
      </div>

      {latestCard ? (
        <div className="mb-4 shrink-0">
          <EvidenceCardView card={latestCard} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-4">
        {STARTER_PROMPTS.map((p) => (
          <button key={p} type="button" className="chip" onClick={() => send(p)} disabled={loading}>
            {p}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 mt-auto"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or follow up…"
          disabled={loading}
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary shrink-0" disabled={loading || input.trim().length < 3}>
          Send
        </button>
      </form>

      {notice ? <p className="text-xs text-[var(--warn)] mt-2">{notice}</p> : null}
    </div>
  );
}
