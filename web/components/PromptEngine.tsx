"use client";

import { EvidenceCardView } from "./EvidenceCard";
import type { CaseDefinition } from "@/lib/cases";
import type {
  EvidenceCard,
  PolicyQuestion,
  PresetConversation,
} from "@/lib/types";

export type PromptMode = "preset" | "individual";

type Props = {
  mode: PromptMode;
  onModeChange: (mode: PromptMode) => void;
  activeCase: CaseDefinition;
  selectedQuestion: PolicyQuestion | null;
  customMessage: string;
  onCustomMessageChange: (v: string) => void;
  conversation: PresetConversation | null;
  card: EvidenceCard | null;
  suggestedFollowUps: string[];
  followUpText: string;
  onFollowUpChange: (v: string) => void;
  loading: boolean;
  notice: string | null;
  onStartPreset: () => void;
  onContinuePreset: () => void;
  onGenerateIndividual: () => void;
  onCopyPitch: () => void;
  copied: boolean;
};

export function PromptEngine({
  mode,
  onModeChange,
  activeCase,
  selectedQuestion,
  customMessage,
  onCustomMessageChange,
  conversation,
  card,
  suggestedFollowUps,
  followUpText,
  onFollowUpChange,
  loading,
  notice,
  onStartPreset,
  onContinuePreset,
  onGenerateIndividual,
  onCopyPitch,
  copied,
}: Props) {
  const presetActive = Boolean(conversation);
  const canContinue =
    presetActive && !conversation?.isComplete && followUpText.trim().length >= 3;

  return (
    <div className="panel p-5 h-full flex flex-col min-h-[680px]">
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <p className="section-label">Engine</p>
          <h2 className="title-serif text-xl mt-1">Planning evidence</h2>
          <p className="text-xs text-[var(--muted)] mt-1.5">{activeCase.subtitle}</p>
        </div>
        <div className="mode-toggle shrink-0">
          {(["preset", "individual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`mode-toggle-btn capitalize ${mode === m ? "mode-toggle-btn-active" : ""}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <section className="mb-5">
        <p className="section-label mb-2">Step 1 · Question</p>
        {mode === "preset" && selectedQuestion ? (
          <div className="rounded-lg border border-[var(--border)] p-4 bg-black/20">
            <p className="text-xs text-[var(--muted)] mb-1.5">
              {selectedQuestion.asker} · {selectedQuestion.role}
            </p>
            <p className="text-sm text-[var(--text)] leading-relaxed">{selectedQuestion.message}</p>
          </div>
        ) : (
          <textarea
            value={customMessage}
            onChange={(e) => onCustomMessageChange(e.target.value)}
            placeholder="Ask anything about London planning data…"
            className="input-field min-h-[100px] resize-none"
          />
        )}
      </section>

      <section className="mb-5 flex-1 flex flex-col min-h-0 evidence-thread">
        <p className="section-label mb-2">Step 2 · Evidence</p>
        {conversation?.messages.length ? (
          <div className="space-y-4 mb-5">
            {conversation.messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "bubble-user text-sm ml-2"
                    : "bubble-assistant text-sm mr-2"
                }
              >
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
                  {m.role === "user" ? "Question" : "Analyst"}
                  {m.mcpTool ? ` · ${m.mcpTool}` : ""}
                </p>
                <p className="text-[var(--text)] whitespace-pre-wrap leading-relaxed text-[0.9375rem]">
                  {m.text}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {card ? (
          <EvidenceCardView card={card} />
        ) : (
          <p className="text-sm text-[var(--muted-dim)] italic">
            Run analysis to fetch live data from the MCP server.
          </p>
        )}
      </section>

      {suggestedFollowUps.length > 0 && !conversation?.isComplete ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestedFollowUps.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => onFollowUpChange(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {presetActive && !conversation?.isComplete ? (
        <input
          value={followUpText}
          onChange={(e) => onFollowUpChange(e.target.value)}
          placeholder="Follow-up question…"
          className="input-field mb-4"
        />
      ) : null}

      <section className="border-t border-[var(--border)] pt-4 mt-auto">
        <p className="section-label mb-3">Step 3 · Actions</p>
        <div className="flex flex-wrap gap-2">
          {mode === "preset" ? (
            !presetActive ? (
              <button type="button" className="btn-primary" disabled={!selectedQuestion || loading} onClick={onStartPreset}>
                {loading ? "Calling MCP…" : "Analyse via MCP"}
              </button>
            ) : conversation?.isComplete ? (
              <span className="text-sm text-[var(--muted)]">Conversation complete</span>
            ) : (
              <button type="button" className="btn-primary" disabled={!canContinue || loading} onClick={onContinuePreset}>
                {loading ? "Calling MCP…" : "Send follow-up"}
              </button>
            )
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={customMessage.trim().length < 8 || loading}
              onClick={onGenerateIndividual}
            >
              {loading ? "Calling MCP…" : "Analyse question"}
            </button>
          )}
          {card ? (
            <button type="button" className="btn-ghost" onClick={onCopyPitch}>
              {copied ? "Copied" : "Copy pitch brief"}
            </button>
          ) : null}
        </div>
        {notice ? <p className="text-xs text-[var(--warn)] mt-3">{notice}</p> : null}
      </section>
    </div>
  );
}
