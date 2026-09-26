import type { MapDataLayers, MapMetricId } from "./map-metrics";

export type MapExplorationMode = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** What red vs green means for this lens */
  readMap: string;
  metric: MapMetricId;
  view?: "2d" | "3d";
  showPoints?: boolean;
  status?: string;
  appSize?: string;
  borough?: string;
  requiresLayer?: keyof MapDataLayers;
};

export const MAP_EXPLORATION_MODES: MapExplorationMode[] = [
  {
    id: "most-desirable",
    label: "Most desirable",
    emoji: "✦",
    description: "Affluence proxy via IMD — where boroughs rank least deprived.",
    readMap: "Green = higher IMD decile (less deprived). Red = more deprived areas.",
    metric: "avg_imd_decile",
    view: "2d",
    requiresLayer: "imd2025",
  },
  {
    id: "highest-demand",
    label: "Highest demand",
    emoji: "▲",
    description: "Where housing demand pressure is strongest (WhereToBuild gap).",
    readMap: "Red = largest housing gap. Requires WTB parquet loaded.",
    metric: "avg_housing_gap",
    view: "2d",
    requiresLayer: "wheretobuild",
  },
  {
    id: "approval-friendly",
    label: "Easiest approvals",
    emoji: "✓",
    description: "Boroughs with the highest raw approval rates among decided apps.",
    readMap: "Green = higher approval rate. Mix of application types still matters.",
    metric: "approval_rate",
    view: "2d",
    showPoints: true,
    status: "Permitted",
  },
  {
    id: "planning-friction",
    label: "Planning friction",
    emoji: "⏱",
    description: "Slow decisions and heavy process — officer delay hotspots.",
    readMap: "Red = longer average days to decision.",
    metric: "avg_decision_delay_days",
    view: "3d",
  },
  {
    id: "deadline-pressure",
    label: "Deadline rush",
    emoji: "⚡",
    description: "KPI bunching — decisions landing on the statutory deadline.",
    readMap: "Red = more apps decided on day 56 (±1). Taller blocks in 3D.",
    metric: "deadline_day_share",
    view: "3d",
  },
  {
    id: "repeat-sites",
    label: "Repeat sites",
    emoji: "↻",
    description: "Officer time re-visiting the same coordinates.",
    readMap: "Red = higher share of apps on repeat plots (25m grid).",
    metric: "repeat_application_share",
    view: "2d",
    showPoints: true,
  },
  {
    id: "consultation-heavy",
    label: "Consultation load",
    emoji: "📄",
    description: "Document intensity — proxy for consultation burden.",
    readMap: "Red = more documents per application on average.",
    metric: "avg_document_count",
    view: "2d",
    appSize: "Large",
    showPoints: true,
  },
  {
    id: "stock-stalled",
    label: "Stock stalled",
    emoji: "🏗",
    description: "Weak housing stock growth — completion gap signal.",
    readMap: "Red = lower % housing stock change 2014–24. Requires HiL layer.",
    metric: "housing_stock_pct_change",
    view: "2d",
    requiresLayer: "housing_in_london",
  },
  {
    id: "rejection-hotspots",
    label: "Rejections",
    emoji: "✕",
    description: "Where refused applications cluster on the map.",
    readMap: "Points show Rejected apps. Choropleth = borough approval rate.",
    metric: "approval_rate",
    view: "2d",
    status: "Rejected",
    showPoints: true,
  },
  {
    id: "population-pressure",
    label: "Population pressure",
    emoji: "👥",
    description: "Census demand baseline — where people already live.",
    readMap: "Red = larger borough populations (Census 2021).",
    metric: "population",
    view: "2d",
    requiresLayer: "census2021",
  },
];

export function getExplorationMode(id: string): MapExplorationMode | undefined {
  return MAP_EXPLORATION_MODES.find((m) => m.id === id);
}

export type AppliedMapState = {
  metric: MapMetricId;
  viewMode: "2d" | "3d";
  showPoints: boolean;
  status: string;
  appSize: string;
  borough: string;
};

export function applyExplorationMode(mode: MapExplorationMode): AppliedMapState {
  return {
    metric: mode.metric,
    viewMode: mode.view ?? "2d",
    showPoints: mode.showPoints ?? false,
    status: mode.status ?? "",
    appSize: mode.appSize ?? "",
    borough: mode.borough ?? "",
  };
}
