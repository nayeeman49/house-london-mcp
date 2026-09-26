import type { CaseId } from "./cases";
import type { ProblemTableId } from "./problem-tables";

export function buildChatUrl(prompt: string): string {
  return `/chat?q=${encodeURIComponent(prompt)}`;
}

export function buildDeskUrl(caseId: CaseId): string {
  return `/desk?case=${caseId}`;
}

export function buildProblemsUrl(opts: {
  table?: ProblemTableId;
  question?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.table) params.set("table", opts.table);
  if (opts.question) params.set("question", opts.question);
  const qs = params.toString();
  return qs ? `/problems?${qs}` : "/problems";
}
