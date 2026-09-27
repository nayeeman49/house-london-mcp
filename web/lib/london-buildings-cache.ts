import type { Map as MapboxMap } from "mapbox-gl";

export function dimBuildingColor(hex: string, mix = 0.65): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "#3f3f46";
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const base = { r: 24, g: 24, b: 27 };
  const blend = (channel: number, baseChannel: number) =>
    Math.round(channel * (1 - mix) + baseChannel * mix);
  return `#${blend(r, base.r).toString(16).padStart(2, "0")}${blend(g, base.g).toString(16).padStart(2, "0")}${blend(b, base.b).toString(16).padStart(2, "0")}`;
}

export type RawLondonBuilding = {
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  height: number;
  min_height: number;
  borough: string;
};

export type CacheProgress = {
  phase: "loading" | "ready";
  step: number;
  total: number;
  count: number;
};

type BoroughZone = {
  borough: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  bbox: [number, number, number, number];
};

const sessionBuildings = new Map<string, RawLondonBuilding>();

function ringCentroid(ring: number[][]): [number, number] {
  const n = Math.max(ring.length - 1, 1);
  let lng = 0;
  let lat = 0;
  for (let i = 0; i < n; i += 1) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return [lng / n, lat / n];
}

function computeBbox(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const visit = (ring: number[][]) => {
    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  };
  if (geometry.type === "Polygon") visit(geometry.coordinates[0]);
  else for (const polygon of geometry.coordinates) visit(polygon[0]);
  return [minLng, minLat, maxLng, maxLat];
}

function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point: [number, number], geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  if (geometry.type === "Polygon") return pointInRing(point, geometry.coordinates[0]);
  return geometry.coordinates.some((polygon) => pointInRing(point, polygon[0]));
}

function pointInBbox(point: [number, number], bbox: [number, number, number, number]) {
  const [lng, lat] = point;
  return lng >= bbox[0] && lat >= bbox[1] && lng <= bbox[2] && lat <= bbox[3];
}

export function buildBoroughZones(boroughGeo: GeoJSON.FeatureCollection): BoroughZone[] {
  return boroughGeo.features.flatMap((feature) => {
    const borough = String(feature.properties?.borough ?? "");
    if (!borough || !feature.geometry) return [];
    const geometry = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    return [{ borough, geometry, bbox: computeBbox(geometry) }];
  });
}

function findBoroughZone(point: [number, number], zones: BoroughZone[]): BoroughZone | null {
  for (const zone of zones) {
    if (!pointInBbox(point, zone.bbox)) continue;
    if (pointInGeometry(point, zone.geometry)) return zone;
  }
  return null;
}

function readHeight(properties: GeoJSON.GeoJsonProperties | null | undefined): number {
  const raw = properties?.height ?? properties?.render_height;
  const value = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 15;
}

function readMinHeight(properties: GeoJSON.GeoJsonProperties | null | undefined): number {
  const raw = properties?.min_height ?? properties?.render_min_height;
  const value = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function featureKey(feature: GeoJSON.Feature): string {
  if (feature.id != null) return String(feature.id);
  const props = feature.properties ?? {};
  return String(props.id ?? props.osm_id ?? props.building_id ?? JSON.stringify(feature.geometry));
}

/** Merge buildings visible in the current viewport into the session cache. */
export function mergeViewportBuildings(
  map: MapboxMap,
  zones: BoroughZone[],
): number {
  if (!map.getSource("composite")) return sessionBuildings.size;

  const raw = map.querySourceFeatures("composite", { sourceLayer: "building" });
  for (const feature of raw) {
    if (!feature.geometry) continue;
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") continue;

    const key = featureKey(feature as GeoJSON.Feature);
    if (sessionBuildings.has(key)) continue;

    const centroid =
      feature.geometry.type === "Polygon"
        ? ringCentroid(feature.geometry.coordinates[0])
        : ringCentroid(feature.geometry.coordinates[0][0]);

    const zone = findBoroughZone(centroid, zones);
    if (!zone) continue;

    sessionBuildings.set(key, {
      geometry: feature.geometry,
      height: readHeight(feature.properties),
      min_height: readMinHeight(feature.properties),
      borough: zone.borough,
    });
  }

  return sessionBuildings.size;
}

export function getSessionBuildings(): RawLondonBuilding[] {
  return Array.from(sessionBuildings.values());
}

export function clearSessionBuildings() {
  sessionBuildings.clear();
}

export function colorizeLondonBuildings(
  raw: RawLondonBuilding[],
  boroughGeo: GeoJSON.FeatureCollection,
  selectedBorough: string,
): GeoJSON.FeatureCollection {
  const colorByBorough = new Map<string, string>();
  for (const feature of boroughGeo.features) {
    const borough = String(feature.properties?.borough ?? "");
    const color = String(feature.properties?.color ?? "#71717a");
    if (borough) colorByBorough.set(borough, color);
  }

  return {
    type: "FeatureCollection",
    features: raw.map((building) => {
      const baseColor = colorByBorough.get(building.borough) ?? "#71717a";
      const dimmed = Boolean(selectedBorough && selectedBorough !== building.borough);
      return {
        type: "Feature",
        geometry: building.geometry,
        properties: {
          borough: building.borough,
          color: dimmed ? dimBuildingColor(baseColor) : baseColor,
          height: building.height,
          min_height: building.min_height,
        },
      };
    }),
  };
}
