import { metricValue, type BoroughMapRecord, type MapMetricId } from "./map-metrics";

/** GeoJSON `name` → Foundations `borough` */
export const GEO_NAME_TO_BOROUGH: Record<string, string> = {
  "City of London": "City",
  "Kensington and Chelsea": "Kensington",
  "Kingston upon Thames": "Kingston",
  "Richmond upon Thames": "Richmond",
};

export function geoNameToBorough(name: string): string {
  return GEO_NAME_TO_BOROUGH[name] ?? name;
}

export type BoroughGeoFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  {
    name: string;
    borough: string;
    metric_value: number | null;
    metric_norm: number;
    color: string;
    height: number;
  }
>;

export function buildBoroughGeoJson(
  base: GeoJSON.FeatureCollection,
  boroughs: BoroughMapRecord[],
  metric: MapMetricId,
  metricInvert: boolean | undefined,
  colorForValue: (v: number | null, min: number, max: number, invert?: boolean) => string,
  elevated = true,
): GeoJSON.FeatureCollection {
  const byName = new Map(boroughs.map((b) => [b.borough, b]));
  const values = boroughs
    .map((b) => metricValue(b, metric))
    .filter((v): v is number => v !== null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  const features: BoroughGeoFeature[] = base.features.map((feature) => {
    const geoName = String(feature.properties?.name ?? "");
    const borough = geoNameToBorough(geoName);
    const record = byName.get(borough) ?? null;
    const metric_value = record ? metricValue(record, metric) : null;
    const span = max - min || 1;
    const metric_norm =
      metric_value === null ? 0 : (metric_value - min) / span;
    const color = colorForValue(metric_value, min, max, metricInvert);
    // Red side of the legend = taller blocks; curve exaggerates high-severity boroughs
    const severityNorm = metricInvert ? metric_norm : 1 - metric_norm;
    const curved = Math.pow(Math.max(severityNorm, 0), 0.35);
    const height = elevated ? 1200 + curved * 22000 : 0;

    return {
      type: "Feature",
      geometry: feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      properties: {
        name: geoName,
        borough,
        metric_value,
        metric_norm,
        color,
        height,
      },
    };
  });

  return { type: "FeatureCollection", features };
}
