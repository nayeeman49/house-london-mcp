"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ProblemLiveStat } from "./ProblemLiveStat";
import { buildMapUrl } from "@/lib/map-links";
import { buildChatUrl, buildDeskUrl, buildProblemsUrl } from "@/lib/problem-links";
import { getCaseById } from "@/lib/cases";
import type { ProblemTable } from "@/lib/problem-tables";

const LAYER_LABELS: Record<string, string> = {
  wheretobuild: "WTB",
  census2021: "Census",
  imd2025: "IMD",
  housing_in_london: "HiL",
};

type Props = {
  table: ProblemTable;
  highlightQuestionId?: string | null;
};

export function ProblemTableCard({ table, highlightQuestionId }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyShareLink = useCallback(async (questionId: string) => {
    const url = `${window.location.origin}${buildProblemsUrl({ table: table.id, question: questionId })}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(questionId);
    window.setTimeout(() => setCopiedId(null), 2000);
  }, [table.id]);

  return (
    <article id={`table-${table.id}`} className="problem-card panel">
      <header className="problem-card-header">
        <div className="problem-card-id" style={{ borderColor: table.accent }}>
          <span style={{ color: table.accent }}>Table {table.id}</span>
        </div>
        <div>
          <h2 className="title-serif title-serif-lg text-2xl">{table.title}</h2>
          <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-wider">{table.theme}</p>
        </div>
        <Link
          href={buildMapUrl(table.questions[0]?.mapLinks[0] ?? { table: table.id })}
          className="btn-primary problem-card-map-cta shrink-0"
        >
          Open on map ↗
        </Link>
      </header>

      <ProblemLiveStat tableId={table.id} accent={table.accent} />

      <p className="problem-card-summary">{table.summary}</p>

      <div className="problem-questions">
        {table.questions.map((q) => {
          const highlighted = highlightQuestionId === q.id;
          const deskCase = q.deskCase ? getCaseById(q.deskCase) : null;

          return (
            <section
              key={q.id}
              id={q.id}
              className={`problem-question ${highlighted ? "problem-highlight" : ""}`}
            >
              <div className="problem-question-header">
                <h3 className="problem-question-prompt">{q.prompt}</h3>
                <button
                  type="button"
                  className="problem-share-btn"
                  onClick={() => void copyShareLink(q.id)}
                  title="Copy share link"
                >
                  {copiedId === q.id ? "Copied!" : "Share link"}
                </button>
              </div>

              {(q.deskCase || q.chatPrompt) && (
                <div className="problem-actions">
                  {q.deskCase && deskCase ? (
                    <Link href={buildDeskUrl(q.deskCase)} className="problem-action-chip">
                      Evidence desk · {deskCase.label} ↗
                    </Link>
                  ) : null}
                  {q.chatPrompt ? (
                    <Link href={buildChatUrl(q.chatPrompt)} className="problem-action-chip">
                      Ask the data ↗
                    </Link>
                  ) : null}
                </div>
              )}

              <div className="problem-block">
                <p className="section-label">Analysis</p>
                <p className="problem-prose">{q.solution}</p>
              </div>

              <div className="problem-block">
                <p className="section-label">How to investigate (HouseData Engine)</p>
                <ol className="problem-steps">
                  {q.approach.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="problem-block">
                <p className="section-label">Map views</p>
                <div className="problem-map-links">
                  {q.mapLinks.map((link) => (
                    <div key={link.label} className="problem-map-link-wrap">
                      <Link href={buildMapUrl(link)} className="problem-map-link">
                        <span>{link.label}</span>
                        <span aria-hidden>↗</span>
                      </Link>
                      {link.requiresLayer ? (
                        <span className="problem-map-layer-badge">
                          Requires {LAYER_LABELS[link.requiresLayer] ?? link.requiresLayer}
                        </span>
                      ) : null}
                      {link.mapRelation ? (
                        <p className="problem-map-relation">{link.mapRelation}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="problem-block">
                <p className="section-label">Further reading</p>
                <ul className="problem-sources">
                  {q.sources.map((src) => (
                    <li key={src.url}>
                      <a href={src.url} target="_blank" rel="noreferrer">
                        {src.label}
                        <span aria-hidden> ↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
