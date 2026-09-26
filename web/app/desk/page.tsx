"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { MotionItem, MotionStagger } from "@/components/Motion";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { ChatBox } from "@/components/ChatBox";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PromptEngine, type PromptMode } from "@/components/PromptEngine";
import { QuestionFeed } from "@/components/QuestionFeed";
import { CASES, getCaseById, type CaseId } from "@/lib/cases";
import { buildPitchExport, downloadPitchExport } from "@/lib/evidence-engine";
import {
  continuePresetWithMcp,
  getSuggestedFollowUps,
  startPresetWithMcp,
} from "@/lib/preset-conversation";
import { POLICY_QUESTIONS } from "@/lib/question-data";
import type {
  AppMetrics,
  EvidenceCard,
  PresetConversation,
  SessionStats,
} from "@/lib/types";

const VALID_CASES = new Set(CASES.map((c) => c.id));

async function callMcpFromBrowser(
  tool: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, arguments: args }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "MCP call failed");
  return data.result as Record<string, unknown>;
}

export default function DeskPage() {
  const searchParams = useSearchParams();
  const caseParam = searchParams.get("case");
  const initialCase =
    caseParam && VALID_CASES.has(caseParam as CaseId)
      ? (caseParam as CaseId)
      : "repeat";

  const [activeCaseId, setActiveCaseId] = useState<CaseId>(initialCase);
  const [deskTab, setDeskTab] = useState<"guided" | "freeform">("guided");
  const [mode, setMode] = useState<PromptMode>("preset");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [conversations, setConversations] = useState<Record<string, PresetConversation>>({});
  const [individualCards, setIndividualCards] = useState<Record<string, EvidenceCard>>({});
  const [followUpText, setFollowUpText] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<"connected" | "checking" | "error">("checking");
  const [mcpTools, setMcpTools] = useState<string[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    questionsAnswered: 0,
    mcpCalls: 0,
    pitchesExported: 0,
  });

  const activeCase = getCaseById(activeCaseId);

  const filteredQuestions = useMemo(
    () => POLICY_QUESTIONS.filter((q) => q.tag === activeCase.tag),
    [activeCase.tag],
  );

  const selectedQuestion =
    POLICY_QUESTIONS.find((q) => q.id === selectedId) ?? filteredQuestions[0] ?? null;

  const activeConversation = selectedQuestion
    ? conversations[selectedQuestion.id] ?? null
    : null;

  const activeCard =
    mode === "individual" && customMessage
      ? individualCards["custom"] ?? null
      : activeConversation?.latestCard ?? null;

  const answeredIds = useMemo(
    () =>
      new Set([
        ...Object.keys(conversations),
        ...(individualCards["custom"] ? ["custom"] : []),
      ]),
    [conversations, individualCards],
  );

  const metrics: AppMetrics = useMemo(
    () => ({
      processedCount: stats.questionsAnswered,
      mcpCalls: stats.mcpCalls,
      pitchesReady: stats.pitchesExported,
      headlineStat:
        activeCard && activeCard.headline.length > 28
          ? `${activeCard.headline.slice(0, 28)}…`
          : activeCard?.headline ?? null,
    }),
    [stats, activeCard],
  );

  useEffect(() => {
    if (caseParam && VALID_CASES.has(caseParam as CaseId)) {
      setActiveCaseId(caseParam as CaseId);
    }
  }, [caseParam]);

  useEffect(() => {
    fetch("/api/mcp")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setMcpStatus("connected");
          setMcpTools((d.tools as { name: string }[]).map((t) => t.name));
        } else {
          setMcpStatus("error");
        }
      })
      .catch(() => setMcpStatus("error"));
  }, []);

  useEffect(() => {
    const visible = filteredQuestions.some((q) => q.id === selectedId);
    if (!visible && filteredQuestions[0]) {
      setSelectedId(filteredQuestions[0].id);
    }
  }, [filteredQuestions, selectedId]);

  const bumpStats = useCallback((mcpCalls = 1) => {
    setStats((s) => ({
      ...s,
      mcpCalls: s.mcpCalls + mcpCalls,
      questionsAnswered: s.questionsAnswered + 1,
    }));
  }, []);

  const onStartPreset = async () => {
    if (!selectedQuestion) return;
    setLoading(true);
    setNotice(null);
    try {
      const conv = await startPresetWithMcp(selectedQuestion, callMcpFromBrowser);
      setConversations((c) => ({ ...c, [selectedQuestion.id]: conv }));
      bumpStats();
      setNotice(`MCP: ${conv.latestCard.mcpTool} · live data`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "MCP failed");
    } finally {
      setLoading(false);
    }
  };

  const onContinuePreset = async () => {
    if (!selectedQuestion || !activeConversation) return;
    setLoading(true);
    setNotice(null);
    try {
      const conv = await continuePresetWithMcp(
        selectedQuestion,
        activeConversation,
        followUpText,
        callMcpFromBrowser,
      );
      setConversations((c) => ({ ...c, [selectedQuestion.id]: conv }));
      setFollowUpText("");
      bumpStats();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Follow-up failed");
    } finally {
      setLoading(false);
    }
  };

  const onGenerateIndividual = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: customMessage }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setIndividualCards({ custom: data.card });
      bumpStats();
      setNotice(`MCP: ${data.tool} via ${data.transport}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const onCopyPitch = async () => {
    if (!activeCard) return;
    await navigator.clipboard.writeText(buildPitchExport(activeCard));
    setCopied(true);
    setStats((s) => ({ ...s, pitchesExported: s.pitchesExported + 1 }));
    setTimeout(() => setCopied(false), 2000);
  };

  const onExportPitch = () => {
    if (!activeCard) {
      setNotice("Analyse a question first to export a pitch.");
      return;
    }
    onCopyPitch();
  };

  const onDownloadPitch = () => {
    if (!activeCard) {
      setNotice("Analyse a question first to download a pitch.");
      return;
    }
    downloadPitchExport(activeCard);
    setStats((s) => ({ ...s, pitchesExported: s.pitchesExported + 1 }));
    setNotice("Pitch file downloaded.");
  };

  const suggestedFollowUps =
    selectedQuestion && activeConversation
      ? getSuggestedFollowUps(selectedQuestion, activeConversation)
      : [];

  return (
    <div id="main-content" className="app-shell min-h-screen px-4 lg:px-6 pb-8 max-w-[1600px] mx-auto">
      <div className="app-grid-overlay" aria-hidden />
      <div className="app-vignette" aria-hidden />
      <div className="relative z-10">
        <MotionStagger>
          <MotionItem>
            <AppNav />
          </MotionItem>
          <MotionItem>
            <DashboardHeader
              cases={CASES}
              activeCaseId={activeCaseId}
              onCaseChange={setActiveCaseId}
              onExportPitch={onExportPitch}
              onDownloadPitch={onDownloadPitch}
            />
          </MotionItem>
          <MotionItem>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[calc(100vh-8rem)] motion-stagger-grid">
              <div className="xl:col-span-4 min-h-[400px] motion-grid-item">
            <QuestionFeed
              questions={filteredQuestions}
              selectedId={selectedId}
              onSelect={setSelectedId}
              answeredIds={answeredIds}
            />
              </div>
              <div className="xl:col-span-5 min-h-[720px] flex flex-col gap-3 motion-grid-item">
            <div className="flex gap-2">
              <button
                type="button"
                className={deskTab === "guided" ? "btn-primary text-xs" : "btn-ghost text-xs"}
                onClick={() => setDeskTab("guided")}
              >
                Guided evidence
              </button>
              <button
                type="button"
                className={deskTab === "freeform" ? "btn-primary text-xs" : "btn-ghost text-xs"}
                onClick={() => setDeskTab("freeform")}
              >
                Freeform chat
              </button>
            </div>
            {deskTab === "guided" ? (
              <PromptEngine
                mode={mode}
                onModeChange={setMode}
                activeCase={activeCase}
                selectedQuestion={selectedQuestion}
                customMessage={customMessage}
                onCustomMessageChange={setCustomMessage}
                conversation={activeConversation}
                card={activeCard}
                suggestedFollowUps={suggestedFollowUps}
                followUpText={followUpText}
                onFollowUpChange={setFollowUpText}
                loading={loading}
                notice={notice}
                onStartPreset={onStartPreset}
                onContinuePreset={onContinuePreset}
                onGenerateIndividual={onGenerateIndividual}
                onCopyPitch={onCopyPitch}
                copied={copied}
              />
            ) : (
              <ChatBox
                onMcpCall={() =>
                  setStats((s) => ({
                    ...s,
                    mcpCalls: s.mcpCalls + 1,
                    questionsAnswered: s.questionsAnswered + 1,
                  }))
                }
              />
            )}
              </div>
              <div className="xl:col-span-3 min-h-[300px] motion-grid-item">
                <AnalyticsPanel
                  activeCase={activeCase}
                  metrics={metrics}
                  mcpStatus={mcpStatus}
                  mcpTools={mcpTools}
                />
              </div>
            </div>
          </MotionItem>
        </MotionStagger>
      </div>
    </div>
  );
}
