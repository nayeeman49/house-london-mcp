import type { MapLinkConfig } from "./map-links";

/** Per-map-preset guidance shown in ProblemMapPanel and on /problems cards */
export const MAP_RELATIONS: Record<string, string> = {
  "completion-gap":
    "Compare stock growth (HiL layer) to approval rate — boroughs with high approvals but pale stock change flag a completion bottleneck.",
  "nppf-deadline":
    "Red boroughs = highest deadline bunching. Expect Bexley and outer boroughs near the top; Camden near the floor.",
  "doc-intensity":
    "Darker red = more documents per application. Inner and growth boroughs often lead on consultation load.",
  "ta-pressure":
    "Low decile = more deprived. Pair with stock change — stressed boroughs often show flat growth and high repeat burden.",
  "land-vs-material":
    "Requires WTB parquet. Red = highest housing gap — permissions may run ahead of viable delivery economics.",
  "process-stops":
    "Rejected points show officer/committee stops; Withdrawn often means applicant exit before decision.",
  "pricing-allocation":
    "Compare population (demand) to approval rate (supply response) — mismatches suggest misallocation.",
  "developer-elasticity":
    "High repeat share = developers keep returning to the same coordinates (inelastic persistence).",
  "approvability":
    "Cycle correlates visually — approval, IMD, and document intensity often co-move by borough mix.",
  sustainability:
    "Permitted points in 2D — click descriptions for green/energy keywords; postcode link shows constraint stack.",
  "where-to-build":
    "WTB gap in red = highest demand pressure. Cross-check IMD so build targets don't deepen deprivation.",
  econometric:
    "Start choropleth here, export borough popups for a regression panel — gap vs approval vs delay.",
  "happiness-meter":
    "Red = worse deprivation (IMD). Lower decile boroughs = higher 'misery risk' in the hackathon meter.",
};

const METRIC_HINTS: Partial<Record<string, string>> = {
  approval_rate: "Green = higher approval among decided applications (watch application mix).",
  housing_stock_pct_change: "Requires Housing in London layer. Shows 2014–24 stock % change by borough.",
  avg_document_count: "Red = heavier consultation load per application.",
  avg_decision_delay_days: "Red = slower decisions — friction hotspot map.",
  deadline_day_share: "Red = more decisions bunched on the statutory deadline (±1 day).",
  repeat_application_share: "Red = more applications landing on repeat coordinates (25m grid).",
  small_site_approval_rate: "Compares small-application approval rates (not total volume).",
  avg_imd_decile: "Red = higher deprivation (decile 1 is worst 10% nationally).",
  avg_housing_gap: "Requires WTB. Red = largest demand/supply gap.",
  avg_housing_tightness: "Requires WTB. Red = tightest housing markets.",
  population: "Requires Census layer. Borough population from Census 2021.",
  households: "Requires Census layer. Household counts as demand proxy.",
};

export function enrichMapLink(link: MapLinkConfig): MapLinkConfig {
  if (link.mapRelation) return link;

  const byProblem = link.problem ? MAP_RELATIONS[link.problem] : undefined;
  const byMetric = link.metric ? METRIC_HINTS[link.metric] : undefined;
  const fallback = link.showPoints
    ? "Application dots are sample geocoded records — hover/click for status and description."
    : undefined;

  return {
    ...link,
    mapRelation: byProblem ?? byMetric ?? fallback ?? "Explore borough colour patterns against the problem hypothesis.",
  };
}
