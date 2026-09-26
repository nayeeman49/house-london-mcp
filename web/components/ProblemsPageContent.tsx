"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { MotionItem, MotionStagger } from "@/components/Motion";
import { ProblemTableCard } from "@/components/ProblemTableCard";
import { buildMapUrl } from "@/lib/map-links";
import { buildProblemsUrl } from "@/lib/problem-links";
import { PROBLEM_TABLES } from "@/lib/problem-tables";

function ProblemsInner() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  const questionParam = searchParams.get("question");

  const highlightQuestion = useMemo(() => {
    if (!questionParam) return null;
    return questionParam;
  }, [questionParam]);

  useEffect(() => {
    if (!tableParam && !questionParam) return;

    const targetId = questionParam ?? (tableParam ? `table-${tableParam}` : null);
    if (!targetId) return;

    const el = document.getElementById(targetId);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("problem-highlight");
    const timer = window.setTimeout(() => el.classList.remove("problem-highlight"), 4000);
    return () => window.clearTimeout(timer);
  }, [tableParam, questionParam]);

  return (
    <MotionStagger>
      <MotionItem>
      <header className="problems-hero">
        <p className="eyebrow">House London #2 · Problem tables</p>
        <h1 className="title-serif title-serif-lg text-4xl md:text-5xl mt-3">
          Policy problems,<br />
          <em className="not-italic text-[var(--muted)]">mapped to evidence</em>
        </h1>
        <p className="text-sm text-[var(--muted)] mt-5 max-w-2xl leading-relaxed">
          Seven problem tables from the sprint — each with a written solution, step-by-step
          investigation using live MCP data, deep links into the interactive map, and external
          sources for policymakers and analysts.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link href="/map" className="btn-primary">
            Open planning map
          </Link>
          <Link href="/chat" className="btn-ghost">
            Ask the data
          </Link>
        </div>
      </header>
      </MotionItem>

      <MotionItem>
      <nav className="problem-toc panel" aria-label="Problem tables">
        <p className="section-label">Jump to table</p>
        <div className="problem-toc-grid">
          {PROBLEM_TABLES.map((t) => (
            <Link
              key={t.id}
              href={buildProblemsUrl({ table: t.id })}
              className={`problem-toc-item ${tableParam === t.id ? "problem-toc-item-active" : ""}`}
            >
              <span className="problem-toc-letter" style={{ color: t.accent }}>
                {t.id}
              </span>
              <span className="problem-toc-title">{t.title}</span>
            </Link>
          ))}
        </div>

        {PROBLEM_TABLES.some((t) => t.questions.length > 1) ? (
          <div className="problem-toc-questions mt-4 pt-4 border-t border-[var(--border)]">
            <p className="section-label">Questions</p>
            <div className="problem-toc-question-list">
              {PROBLEM_TABLES.flatMap((t) =>
                t.questions.map((q) => (
                  <Link
                    key={q.id}
                    href={buildProblemsUrl({ table: t.id, question: q.id })}
                    className={`problem-toc-question ${
                      highlightQuestion === q.id ? "problem-toc-question-active" : ""
                    }`}
                  >
                    <span className="problem-toc-q-table" style={{ color: t.accent }}>
                      {t.id}
                    </span>
                    <span className="problem-toc-q-prompt">{q.prompt}</span>
                  </Link>
                )),
              )}
            </div>
          </div>
        ) : null}
      </nav>
      </MotionItem>

      <MotionItem>
      <div className="problem-list motion-stagger">
        {PROBLEM_TABLES.map((table) => (
          <div key={table.id} className="motion-item">
            <ProblemTableCard
              table={table}
              highlightQuestionId={highlightQuestion}
            />
          </div>
        ))}
      </div>
      </MotionItem>

      <MotionItem>
      <footer className="problems-footer">
        <p className="text-xs text-[var(--muted-dim)] leading-relaxed">
          Map links pre-set metric, filters, and view mode. Share a question with{" "}
          <code className="text-[10px]">/problems?table=D&amp;question=d-pokemon</code>. Data from{" "}
          <a href="https://foreman.house-london.uk/" target="_blank" rel="noreferrer">
            Foundations
          </a>
          , Census 2021, IMD 2025, Housing in London, and WhereToBuild (when loaded).
        </p>
        <Link
          href={buildMapUrl({ metric: "approval_rate", view: "2d", table: "A" })}
          className="btn-ghost mt-4 inline-flex"
        >
          Start with Table A on the map ↗
        </Link>
      </footer>
      </MotionItem>
    </MotionStagger>
  );
}

export function ProblemsPageContent() {
  return (
    <div id="main-content" className="app-shell min-h-screen px-4 lg:px-6 pb-16 max-w-4xl mx-auto">
      <div className="app-grid-overlay" aria-hidden />
      <div className="app-vignette" aria-hidden />
      <div className="relative z-10">
        <AppNav />
        <Suspense
          fallback={
            <div className="panel p-8 text-sm text-[var(--muted)] mt-8">Loading problem tables…</div>
          }
        >
          <ProblemsInner />
        </Suspense>
      </div>
    </div>
  );
}
