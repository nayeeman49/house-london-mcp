import type { MapMetricId } from "./map-metrics";

export type MapLinkConfig = {
  label: string;
  metric?: MapMetricId;
  borough?: string;
  status?: string;
  appSize?: string;
  view?: "2d" | "3d";
  showPoints?: boolean;
  postcode?: string;
  table?: string;
  problem?: string;
  /** How this preset map view helps investigate the problem */
  mapRelation?: string;
  /** Optional dataset layer required for this metric (shows badge on /problems) */
  requiresLayer?: "wheretobuild" | "census2021" | "imd2025" | "housing_in_london";
};

export function buildMapUrl(config: MapLinkConfig): string {
  const params = new URLSearchParams();
  if (config.metric) params.set("metric", config.metric);
  if (config.borough) params.set("borough", config.borough);
  if (config.status) params.set("status", config.status);
  if (config.appSize) params.set("appSize", config.appSize);
  if (config.view) params.set("view", config.view);
  if (config.showPoints === false) params.set("points", "false");
  if (config.postcode) params.set("postcode", config.postcode);
  if (config.table) params.set("table", config.table);
  if (config.problem) params.set("problem", config.problem);
  const qs = params.toString();
  return qs ? `/map?${qs}` : "/map";
}
