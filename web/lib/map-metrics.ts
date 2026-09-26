export type MapMetricId =
  | "approval_rate"
  | "avg_decision_delay_days"
  | "avg_document_count"
  | "deadline_day_share"
  | "repeat_application_share"
  | "small_site_approval_rate"
  | "total_applications"
  | "avg_imd_decile"
  | "avg_imd_score"
  | "population"
  | "households"
  | "housing_stock_pct_change"
  | "avg_housing_gap"
  | "avg_housing_tightness";

export type BoroughMapRecord = {
  borough: string;
  total_applications: number;
  avg_decision_delay_days: number | null;
  avg_document_count: number | null;
  approval_rate: number | null;
  deadline_day_share: number | null;
  approval_rate_on_deadline: number | null;
  approval_rate_before_deadline: number | null;
  geocoded_applications: number;
  repeat_applications: number;
  repeat_application_share: number | null;
  small_applications: number;
  small_site_approval_rate: number | null;
  population?: number | null;
  households?: number | null;
  avg_imd_decile?: number | null;
  avg_imd_score?: number | null;
  housing_stock_pct_change?: number | null;
  avg_housing_gap?: number | null;
  avg_housing_tightness?: number | null;
};

export type MapApplication = {
  lat: number;
  lng: number;
  borough: string;
  app_size: string | null;
  status: string | null;
  days_to_decision: number | null;
  n_dwellings: number | null;
  description: string;
  reference: string | null;
};

export type MapPostcodeResult = {
  postcode: string;
  latitude: number;
  longitude: number;
  borough_hint?: string;
  constraints_found: { name?: string | null; dataset?: string | null }[];
  imd?: {
    imd_decile?: number;
    imd_score?: number;
    lsoa_name?: string;
  };
};

export type MapDataLayers = {
  census2021?: boolean;
  imd2025?: boolean;
  housing_in_london?: boolean;
  wheretobuild?: boolean;
};

export const MAP_METRICS: {
  id: MapMetricId;
  label: string;
  format: (v: number) => string;
  invert?: boolean;
  source: string;
}[] = [
  {
    id: "approval_rate",
    label: "Approval rate (Foundations)",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    source: "Foundations",
  },
  {
    id: "avg_decision_delay_days",
    label: "Avg decision days (Foundations)",
    format: (v) => `${v.toFixed(0)} days`,
    invert: true,
    source: "Foundations",
  },
  {
    id: "avg_document_count",
    label: "Avg documents per app (Foundations)",
    format: (v) => v.toFixed(1),
    invert: true,
    source: "Foundations",
  },
  {
    id: "deadline_day_share",
    label: "Deadline-day share (Foundations)",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    invert: true,
    source: "Foundations",
  },
  {
    id: "repeat_application_share",
    label: "Repeat application share (Foundations)",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    invert: true,
    source: "Foundations",
  },
  {
    id: "small_site_approval_rate",
    label: "Small-site approval (Foundations)",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    source: "Foundations",
  },
  {
    id: "total_applications",
    label: "Total applications (Foundations)",
    format: (v) => v.toLocaleString(),
    source: "Foundations",
  },
  {
    id: "avg_imd_decile",
    label: "IMD decile (avg, lower = more deprived)",
    format: (v) => v.toFixed(1),
    invert: true,
    source: "IMD 2025",
  },
  {
    id: "avg_imd_score",
    label: "IMD score (avg)",
    format: (v) => v.toFixed(1),
    invert: true,
    source: "IMD 2025",
  },
  {
    id: "population",
    label: "Population (Census 2021)",
    format: (v) => v.toLocaleString(),
    source: "Census 2021",
  },
  {
    id: "households",
    label: "Households (Census 2021)",
    format: (v) => v.toLocaleString(),
    source: "Census 2021",
  },
  {
    id: "housing_stock_pct_change",
    label: "Housing stock change 2014–24 (%)",
    format: (v) => `${v.toFixed(1)}%`,
    source: "Housing in London",
  },
  {
    id: "avg_housing_gap",
    label: "Housing gap (WhereToBuild)",
    format: (v) => v.toFixed(2),
    invert: true,
    source: "WhereToBuild",
  },
  {
    id: "avg_housing_tightness",
    label: "Housing tightness (WhereToBuild)",
    format: (v) => v.toFixed(2),
    invert: true,
    source: "WhereToBuild",
  },
];

export function metricValue(record: BoroughMapRecord, metric: MapMetricId): number | null {
  const v = record[metric];
  return typeof v === "number" ? v : null;
}

export function colorForValue(
  value: number | null,
  min: number,
  max: number,
  invert = false,
): string {
  if (value === null || min === max) return "#6b7280";
  const t = (value - min) / (max - min);
  const n = invert ? 1 - t : t;
  const r = Math.round(248 - n * 180);
  const g = Math.round(113 + n * 100);
  const b = Math.round(113 + n * 20);
  return `rgb(${r}, ${g}, ${b})`;
}

export function radiusForApps(count: number, max: number): number {
  if (max <= 0) return 8;
  return 6 + (count / max) * 18;
}
