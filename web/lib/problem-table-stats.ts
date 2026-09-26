import type { ProblemTableId } from "./problem-tables";

export type TableLiveStatConfig = {
  tool: string;
  arguments: Record<string, unknown>;
  format: (data: Record<string, unknown>) => string | null;
};

function pct(value: number | null | undefined): string {
  if (value == null) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

export const TABLE_LIVE_STATS: Record<ProblemTableId, TableLiveStatConfig> = {
  A: {
    tool: "get_london_borough_map_metrics",
    arguments: { grid_meters: 25 },
    format: (data) => {
      const boroughs = (data.boroughs as Array<{
        borough: string;
        approval_rate?: number | null;
        housing_stock_pct_change?: number | null;
      }>) ?? [];
      const withStock = boroughs.filter((b) => b.housing_stock_pct_change != null);
      if (!withStock.length) {
        const avg =
          boroughs.reduce((s, b) => s + (b.approval_rate ?? 0), 0) / (boroughs.length || 1);
        return `London avg approval rate: ${pct(avg)}`;
      }
      const sorted = [...withStock].sort(
        (a, b) => (a.housing_stock_pct_change ?? 0) - (b.housing_stock_pct_change ?? 0),
      );
      const lowest = sorted[0];
      return `${lowest.borough}: ${lowest.housing_stock_pct_change?.toFixed(1) ?? "?"}% stock change · ${pct(lowest.approval_rate)} approved`;
    },
  },
  B: {
    tool: "get_deadline_bunching_by_borough",
    arguments: {},
    format: (data) =>
      `${pct(data.deadline_day_share as number)} of London decisions land on the statutory deadline`,
  },
  C: {
    tool: "get_london_borough_map_metrics",
    arguments: { grid_meters: 25 },
    format: (data) => {
      const boroughs = (data.boroughs as Array<{
        borough: string;
        avg_document_count?: number | null;
      }>) ?? [];
      const sorted = [...boroughs].sort(
        (a, b) => (b.avg_document_count ?? 0) - (a.avg_document_count ?? 0),
      );
      const top = sorted[0];
      if (!top?.avg_document_count) return null;
      return `${top.borough} leads on consultation intensity: ${top.avg_document_count.toFixed(1)} docs/app`;
    },
  },
  D: {
    tool: "get_repeat_application_burden",
    arguments: {},
    format: (data) =>
      `${pct(data.repeat_application_share as number)} of apps revisit repeat sites (TA pressure proxy)`,
  },
  E: {
    tool: "get_small_site_approval_gap",
    arguments: {},
    format: (data) => {
      const outer = data.outer_share_of_small_applications as number | undefined;
      const inner = data.inner_london as { approval_rate?: number } | undefined;
      const outerB = data.outer_london as { approval_rate?: number } | undefined;
      return `Outer London: ${pct(outer)} of small apps · approval ${pct(outerB?.approval_rate)} vs inner ${pct(inner?.approval_rate)}`;
    },
  },
  F: {
    tool: "get_planning_friction_by_borough",
    arguments: { borough_name: "Lambeth" },
    format: (data) =>
      `Lambeth: ${pct(data.approval_rate as number)} approved · ${data.avg_decision_delay_days ?? "?"} days avg`,
  },
  G: {
    tool: "get_deprivation_by_borough",
    arguments: { borough_name: "Tower Hamlets" },
    format: (data) =>
      `Tower Hamlets IMD decile ${data.avg_imd_decile ?? "?"} (1 = most deprived nationally)`,
  },
};
