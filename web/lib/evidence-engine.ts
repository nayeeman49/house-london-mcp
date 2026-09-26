import type { EvidenceCard, PolicyQuestion } from "./types";

export function pct(value: number | null | undefined): string {
  if (value == null) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

export function buildEvidenceFromMcp(
  question: PolicyQuestion,
  tool: string,
  data: Record<string, unknown> | unknown[],
): EvidenceCard {
  const now = new Date().toISOString();

  if (tool === "get_repeat_application_burden") {
    const share = data.repeat_application_share as number | undefined;
    const repeatApps = data.repeat_applications as number | undefined;
    const totalApps = data.total_applications as number | undefined;
    return {
      questionId: question.id,
      headline: `${pct(share)} of housing applications sit at sites with 2+ prior applications`,
      mechanism:
        "Coordinate clustering (~25m) surfaces repeat bites — amendments, resubmissions, reserved matters — that consume officer time without always adding new capacity.",
      dataSource: `Foundations 2022–25 · ${totalApps?.toLocaleString() ?? "?"} geocoded apps · ${repeatApps?.toLocaleString() ?? "?"} on repeat sites`,
      policyAsk:
        "Count sites once in pipeline reporting; streamline amendment routes instead of full re-applications.",
      caveat:
        "Grid clustering is an upper bound — adjacent buildings can cluster together.",
      replyText: `Across London, ${pct(share)} of housing-relevant applications (${repeatApps?.toLocaleString()} of ${totalApps?.toLocaleString()}) land at coordinates with 2+ prior applications. That's officer time spent re-adjudicating the same plot — not net-new supply.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "get_deadline_bunching_by_borough") {
    const borough = (data.borough as string) ?? "London";
    const deadlineShare = data.deadline_day_share as number | undefined;
    const onDeadline = data.approval_rate_on_deadline as number | undefined;
    const before = data.approval_rate_well_before_deadline as number | undefined;
    return {
      questionId: question.id,
      headline: `${pct(deadlineShare)} of ${borough} decisions land on the statutory deadline (±1 day)`,
      mechanism:
        "MHCLG timeliness KPIs (P152/P154) reward deciding by the deadline — House London #0 found deadline-day cohorts approve less often.",
      dataSource: `Foundations · ${(data.total_decided as number)?.toLocaleString() ?? "?"} decided applications`,
      policyAsk:
        "Replace '% decided within 8 weeks' with a quality-adjusted or appeal-survival metric.",
      caveat: "Statutory clock inferred from app_size when n_statutory_days is missing.",
      replyText: `In ${borough}, ${pct(deadlineShare)} of decided applications fall on the statutory deadline window. Approval rate on deadline: ${pct(onDeadline)} vs ${pct(before)} well before — consistent with rushed decisions to hit KPIs.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "get_small_site_approval_gap") {
    const inner = data.inner_london as { applications: number; approval_rate: number };
    const outer = data.outer_london as { applications: number; approval_rate: number };
    const outerShare = data.outer_share_of_small_applications as number | undefined;
    return {
      questionId: question.id,
      headline: `Outer London submits ${pct(outerShare)} of small applications — approval rates are similar (${pct(outer?.approval_rate)} vs ${pct(inner?.approval_rate)})`,
      mechanism:
        "London Plan targets ~38–40% of supply from small sites; delivered share is ~15%. The gap is not primarily outer-London refusal.",
      dataSource: "Foundations · app_size='Small' · 2022–25",
      policyAsk:
        "Focus on unit delivery and design-code submission friction, not committee bias against outer boroughs.",
      caveat: "app_size='Small' proxies householder/minor apps; n_dwellings is sparse in Foundations.",
      replyText: `Outer London accounts for ${pct(outerShare)} of small applications (${outer?.applications?.toLocaleString()} vs inner ${inner?.applications?.toLocaleString()}). Approval rates: outer ${pct(outer?.approval_rate)}, inner ${pct(inner?.approval_rate)}. The small-sites shortfall is not a refusal story.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "list_data_sources") {
    const loaded = data.loaded as Record<string, boolean> | undefined;
    const loadedNames = loaded
      ? Object.entries(loaded)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ")
      : "foundations";
    return {
      questionId: question.id,
      headline: "Data sources loaded for this session",
      mechanism:
        "Each MCP tool reads from local Parquet or live APIs. Optional datasets must be downloaded separately.",
      dataSource: loadedNames || "Foundations via Housing Intent Engine",
      policyAsk: "Ask about a specific metric or borough — tools fetch fresh numbers per message.",
      caveat:
        "Foundations covers applications and consultation intensity, not build-out. Repeat-site and deadline metrics carry method caveats — ask if unsure.",
      replyText: `Available locally: ${loadedNames || "foundations only"}. Use list_data_sources notes for download instructions.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "get_planning_friction_by_borough") {
    const borough = (data.borough as string) ?? "Unknown";
    return {
      questionId: question.id,
      headline: `${borough}: ${data.avg_decision_delay_days ?? "?"} days avg · ${pct(data.approval_rate as number)} approved`,
      mechanism: "Borough-level friction baseline from Foundations decision timing and outcomes.",
      dataSource: `Foundations · ${(data.total_applications as number)?.toLocaleString() ?? "?"} apps · ${data.data_source ?? "remote"}`,
      policyAsk: "Compare like-for-like app types before attributing to officer competence.",
      caveat: "Raw approval rates vary by application mix, not just borough culture.",
      replyText: `${borough} averages ${data.avg_decision_delay_days} days to decision, ${data.avg_document_count} documents per app, and ${pct(data.approval_rate as number)} approval among decided applications.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "get_deprivation_by_borough" || tool === "get_deprivation_by_postcode") {
    const borough = (data.borough as string) ?? "Unknown";
    const decile = data.avg_imd_decile ?? data.imd_decile;
    const score = data.avg_imd_score ?? data.imd_score;
    return {
      questionId: question.id,
      headline: `${borough}: IMD decile ${decile ?? "?"} (1 = most deprived nationally)`,
      mechanism: "IMD 2025 aggregates LSOA deprivation within borough boundaries.",
      dataSource: "IMD 2025 · MHCLG",
      policyAsk: "Cross-check planning outcomes against deprivation — not as a proxy for need alone.",
      caveat: "Decile is relative to England; LSOA aggregation masks intra-borough variation.",
      replyText: `${borough} averages IMD decile ${decile ?? "n/a"} (score ${score ?? "n/a"}). ${data.lsoas_in_bottom_decile ?? 0} LSOAs in the most deprived decile nationally.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "get_census_stats_by_borough") {
    const borough = (data.borough as string) ?? "Unknown";
    const cached = data.cached as { population?: number; households?: number } | null;
    const live = data.live_nomis as { population?: number; households?: number } | null;
    const pop = cached?.population ?? live?.population;
    const hh = cached?.households ?? live?.households;
    const src = cached ? "local Census 2021 parquet" : "Nomis live API";
    return {
      questionId: question.id,
      headline: `${borough}: ${pop?.toLocaleString() ?? "?"} residents · ${hh?.toLocaleString() ?? "?"} households`,
      mechanism: "Census 2021 LTLA counts for population and household baseline.",
      dataSource: `Census 2021 · ${src}`,
      policyAsk: "Use household growth against planning permissions to stress-test delivery assumptions.",
      caveat: "Census is a snapshot; mid-year estimates may differ slightly.",
      replyText: `${borough} (GSS ${data.gss_code}): ${pop?.toLocaleString() ?? "?"} population, ${hh?.toLocaleString() ?? "?"} households (${src}).`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "get_housing_in_london_by_borough") {
    const borough = (data.borough as string) ?? "Unknown";
    const indicators = (data.indicators as Array<{ indicator: string; value: unknown }>) ?? [];
    const preview = indicators
      .slice(0, 4)
      .map((i) => `${i.indicator}: ${i.value}`)
      .join("; ");
    return {
      questionId: question.id,
      headline: `${borough}: ${indicators.length} Housing in London indicators`,
      mechanism: "GLA Housing in London tables — borough-level policy and market context.",
      dataSource: "data.london.gov.uk · Housing in London",
      policyAsk: "Pair HiL delivery indicators with Foundations application friction.",
      caveat: "Indicator mix varies by sheet; filter with the indicator argument if needed.",
      replyText: preview
        ? `${borough} HiL sample: ${preview}${indicators.length > 4 ? "…" : ""}`
        : `No Housing in London rows matched for ${borough}.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "get_wheretobuild_by_borough" || tool === "get_wheretobuild_by_postcode") {
    const borough = (data.borough as string) ?? "Unknown";
    if (data.available === false) {
      return {
        questionId: question.id,
        headline: "WhereToBuild data not loaded locally",
        mechanism: "Warwick WhereToBuild parquet is event-only — not publicly downloadable.",
        dataSource: "WhereToBuild (hackathon parquet)",
        policyAsk: "Obtain wheretobuild.parquet from House London organisers.",
        caveat: String(data.instructions ?? data.error ?? ""),
        replyText: String(data.instructions ?? data.error ?? "Place data/wheretobuild.parquet to enable."),
        processedAt: now,
        source: "mcp",
        mcpTool: tool,
        rawMetrics: data,
      };
    }
    const record = (data.data as Record<string, unknown>) ?? {};
    return {
      questionId: question.id,
      headline: `${borough}: WhereToBuild housing gap metrics loaded`,
      mechanism: "Demand/supply tightness from Warwick WhereToBuild model.",
      dataSource: "WhereToBuild · wheretobuild.warwick.ac.uk",
      policyAsk: "Compare gap scores with borough approval friction and small-site delivery.",
      caveat: "Event dataset — methodology differs from Foundations application counts.",
      replyText: `${borough} WhereToBuild: ${Object.entries(record)
        .slice(0, 5)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "search_planning_constraints") {
    const found = (data.constraints_found as Array<{ name?: string; dataset?: string }>) ?? [];
    return {
      questionId: question.id,
      headline: `${found.length} planning constraints near ${data.postcode ?? "postcode"}`,
      mechanism: "Planning Data API entity search at postcode centroid.",
      dataSource: "planning.data.gov.uk",
      policyAsk: "Use constraint stack to explain site viability — not as a veto list alone.",
      caveat: "Radius search may miss edge cases; verify on borough GIS.",
      replyText: found.length
        ? `Near ${data.postcode}: ${found.map((c) => `${c.dataset}: ${c.name}`).join("; ")}`
        : `No constraints returned for ${data.postcode} in the queried datasets.`,
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: data,
    };
  }

  if (tool === "search_uk_planit_applications") {
    const apps = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    const first = apps[0] as Record<string, unknown> | undefined;
    if (first?.error) {
      return {
        questionId: question.id,
        headline: "PlanIt search returned an error",
        mechanism: "UK PlanIt live application feed.",
        dataSource: "planit.org.uk",
        policyAsk: "Use for live context alongside Foundations historical data.",
        caveat: String(first.error),
        replyText: String(first.error),
        processedAt: now,
        source: "mcp",
        mcpTool: tool,
        rawMetrics: { applications: apps },
      };
    }
    return {
      questionId: question.id,
      headline: `${apps.length} live PlanIt applications nearby`,
      mechanism: "UK PlanIt JSON API — recent applications within search radius.",
      dataSource: "planit.org.uk",
      policyAsk: "Contrast live pipeline with Foundations repeat-site burden.",
      caveat: "PlanIt coverage varies by borough; capped to 5 results.",
      replyText: apps.length
        ? apps
            .map(
              (a) =>
                `${(a as Record<string, unknown>).status ?? "?"} · ${((a as Record<string, unknown>).description as string)?.slice(0, 80) ?? "—"}`,
            )
            .join("\n")
        : "No PlanIt applications in radius.",
      processedAt: now,
      source: "mcp",
      mcpTool: tool,
      rawMetrics: { applications: apps },
    };
  }

  return {
    questionId: question.id,
    headline: "Analysis complete",
    mechanism: "MCP tool returned data",
    dataSource: "Foundations via Housing Intent Engine",
    policyAsk: "Review raw metrics and draft intervention.",
    caveat: "",
    replyText: JSON.stringify(data, null, 2),
    processedAt: now,
    source: "mcp",
    mcpTool: tool,
    rawMetrics: data,
  };
}

export function toolPlanForQuestion(question: PolicyQuestion): {
  tool: string;
  arguments: Record<string, unknown>;
} {
  switch (question.category) {
    case "repeat":
    case "phantom":
      return {
        tool: "get_repeat_application_burden",
        arguments: question.borough ? { borough_name: question.borough } : {},
      };
    case "deadline":
      return {
        tool: "get_deadline_bunching_by_borough",
        arguments: question.borough ? { borough_name: question.borough } : {},
      };
    case "small-sites":
      return { tool: "get_small_site_approval_gap", arguments: {} };
    case "friction":
      return {
        tool: "get_planning_friction_by_borough",
        arguments: { borough_name: question.borough ?? "Lambeth" },
      };
    case "pitch":
      return { tool: "get_repeat_application_burden", arguments: {} };
    case "meta":
      return { tool: "list_data_sources", arguments: {} };
    default:
      return { tool: "list_data_sources", arguments: {} };
  }
}

export function downloadPitchExport(card: EvidenceCard): void {
  const text = buildPitchExport(card);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "house-london-pitch.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildPitchExport(card: EvidenceCard): string {
  return [
    "HOUSE LONDON — 2-MINUTE PITCH DRAFT",
    "",
    `Opening: "${card.headline}"`,
    "",
    `Mechanism: ${card.mechanism}`,
    "",
    `Evidence: ${card.dataSource}`,
    "",
    `Policy ask: ${card.policyAsk}`,
    "",
    card.caveat ? `Caveat: ${card.caveat}` : "",
    "",
    "---",
    "Generated by Foundations Evidence Desk · MCP: Housing Intent Engine",
  ]
    .filter(Boolean)
    .join("\n");
}
