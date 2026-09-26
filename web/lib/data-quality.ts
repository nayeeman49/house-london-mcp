import type { EvidenceCard, PolicyQuestion } from "./types";

/** Known limits of Foundations and companion datasets — not invented at runtime. */
export const FOUNDATIONS_LIMITS = {
  coverage:
    "Foundations 2022–25: London housing-relevant planning applications from LPA portals. Includes decision timing, n_documents, n_comments, geocoded lat/lng where available.",
  n_documents:
    "n_documents is scraped from portal document tabs — counts files attached to the application record, not officer workload perfectly. Null when the portal omitted the field; averages exclude nulls.",
  geocoding:
    "Repeat-site clustering uses ~25m grid cells on lat/lng. Adjacent buildings can cluster — treat repeat-site share as an upper bound.",
  deadlines:
    "Statutory clock inferred from app_size when n_statutory_days is missing — deadline bunching is approximate.",
  smallSites:
    "app_size='Small' proxies householder/minor apps; n_dwellings is sparse — do not treat as unit delivery counts.",
  notIncluded:
    "Foundations does not include commencements, completions, or appeal outcomes. Use Planning London Datahub / Housing in London for delivery.",
};

export function isMetaQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return /accuracy|accurate|reliable|trust|data quality|limitation|caveat|methodology|how good|how reliable|coverage|readme|documentation|what data|where.*data|source of|dataset|metadata|limitations?|n_documents?|field mean/.test(
    lower,
  );
}

export function isDocumentCountQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return /\bdoc\b|\bdocs\b|document count|n_document|planning doc|files per app/.test(lower);
}

export function buildMetaEvidenceCard(
  question: PolicyQuestion,
  sources: Record<string, unknown> | undefined,
  friction?: Record<string, unknown>,
): EvidenceCard {
  const now = new Date().toISOString();
  const docQ = isDocumentCountQuestion(question.message);
  const loaded = (sources?.loaded as Record<string, boolean> | undefined) ?? {};

  const headline = docQ
    ? "n_documents counts portal attachments — useful for friction, not a perfect workload measure"
    : "HouseData Engine uses live MCP pulls — each metric has explicit caveats";

  const replyParts = [
    FOUNDATIONS_LIMITS.coverage,
    docQ ? FOUNDATIONS_LIMITS.n_documents : null,
    FOUNDATIONS_LIMITS.notIncluded,
  ].filter(Boolean);

  if (friction?.avg_document_count != null) {
    replyParts.push(
      `Example (${friction.borough}): ${friction.avg_document_count} documents per app on average among apps with decision dates (${(friction.total_applications as number)?.toLocaleString()} apps).`,
    );
  }

  const loadedList = Object.entries(loaded)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");

  return {
    questionId: question.id,
    headline,
    mechanism:
      "Stats come from DuckDB queries on local Parquet (Foundations + optional IMD, Census, Housing in London, WhereToBuild). The analyst cites tool names; caveats are part of honest policy use.",
    dataSource: loadedList
      ? `Loaded locally: ${loadedList}`
      : "Foundations required; optional layers via scripts/download_datasets.py",
    policyAsk:
      "When pitching, lead with the number then name the caveat — e.g. repeat sites are an upper bound, not exact duplicate plots.",
    caveat: [
      FOUNDATIONS_LIMITS.geocoding,
      FOUNDATIONS_LIMITS.deadlines,
      FOUNDATIONS_LIMITS.smallSites,
    ].join(" "),
    replyText: replyParts.join(" "),
    processedAt: now,
    source: "mcp",
    mcpTool: "list_data_sources",
    rawMetrics: { sources, friction },
  };
}
