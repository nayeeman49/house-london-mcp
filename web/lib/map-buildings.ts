import type {
  FillExtrusionLayerSpecification,
  GeoJSONSource,
  Map as MapboxMap,
} from "mapbox-gl";
import {
  buildBoroughZones,
  clearSessionBuildings,
  colorizeLondonBuildings,
  getSessionBuildings,
  mergeViewportBuildings,
  type CacheProgress,
} from "./london-buildings-cache";

export { dimBuildingColor } from "./london-buildings-cache";
export type { CacheProgress };

export const COLORED_BUILDINGS_SOURCE = "colored-buildings";
export const COLORED_BUILDINGS_LAYER = "colored-buildings-extrusion";
export const NATIVE_BUILDINGS_LAYER = "native-3d-buildings";
export const BUILDINGS_MIN_ZOOM = 8;
export const NATIVE_BUILDINGS_MIN_ZOOM = 11.5;

const REFRESH_DEBOUNCE_MS = 250;

const EXTRUSION_HEIGHT: NonNullable<
  FillExtrusionLayerSpecification["paint"]
>["fill-extrusion-height"] = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  ["*", ["coalesce", ["get", "height"], 18], 8],
  9,
  ["*", ["coalesce", ["get", "height"], 18], 6],
  10,
  ["*", ["coalesce", ["get", "height"], 18], 4.5],
  11,
  ["*", ["coalesce", ["get", "height"], 18], 3],
  13,
  ["*", ["coalesce", ["get", "height"], 18], 1.6],
  15,
  ["coalesce", ["get", "height"], 18],
];

const EXTRUSION_BASE: NonNullable<
  FillExtrusionLayerSpecification["paint"]
>["fill-extrusion-base"] = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  0,
  11,
  ["coalesce", ["get", "min_height"], 0],
];

const COLORED_BUILDING_PAINT: FillExtrusionLayerSpecification["paint"] = {
  "fill-extrusion-color": ["get", "color"],
  "fill-extrusion-height": EXTRUSION_HEIGHT,
  "fill-extrusion-base": EXTRUSION_BASE,
  "fill-extrusion-opacity": 1,
  "fill-extrusion-vertical-gradient": false,
};

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
const activeCleanup = new WeakMap<MapboxMap, () => void>();

function findLabelAnchor(map: MapboxMap): string | undefined {
  return map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id;
}

export function isBuildingLayer(layerId: string) {
  return (
    layerId === COLORED_BUILDINGS_LAYER ||
    layerId === NATIVE_BUILDINGS_LAYER ||
    layerId.startsWith("metric-buildings-")
  );
}

export function isMetricBuildingLayer(layerId: string) {
  return isBuildingLayer(layerId);
}

function removeLegacyMetricLayers(map: MapboxMap) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (!layer.id.startsWith("metric-buildings-")) continue;
    try {
      map.removeLayer(layer.id);
    } catch {
      /* ignore */
    }
  }
}

export function removeBuildingLayers(map: MapboxMap) {
  for (const id of [COLORED_BUILDINGS_LAYER, NATIVE_BUILDINGS_LAYER, "global-3d-buildings"]) {
    if (map.getLayer(id)) {
      try {
        map.removeLayer(id);
      } catch {
        /* ignore */
      }
    }
  }
  if (map.getSource(COLORED_BUILDINGS_SOURCE)) {
    try {
      map.removeSource(COLORED_BUILDINGS_SOURCE);
    } catch {
      /* ignore */
    }
  }
  removeLegacyMetricLayers(map);
}

export function removeMetricBuildingLayers(map: MapboxMap) {
  removeBuildingLayers(map);
}

function ensureBuildingLayers(map: MapboxMap) {
  removeLegacyMetricLayers(map);
  const beforeId = findLabelAnchor(map);

  if (!map.getSource(COLORED_BUILDINGS_SOURCE)) {
    map.addSource(COLORED_BUILDINGS_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer(NATIVE_BUILDINGS_LAYER) && map.getSource("composite")) {
    map.addLayer(
      {
        id: NATIVE_BUILDINGS_LAYER,
        source: "composite",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: NATIVE_BUILDINGS_MIN_ZOOM,
        filter: ["==", ["get", "extrude"], "true"],
        paint: {
          "fill-extrusion-color": "#64748b",
          "fill-extrusion-height": EXTRUSION_HEIGHT,
          "fill-extrusion-base": EXTRUSION_BASE,
          "fill-extrusion-opacity": 0.88,
          "fill-extrusion-vertical-gradient": false,
        },
      },
      beforeId,
    );
  }

  if (!map.getLayer(COLORED_BUILDINGS_LAYER)) {
    map.addLayer(
      {
        id: COLORED_BUILDINGS_LAYER,
        source: COLORED_BUILDINGS_SOURCE,
        type: "fill-extrusion",
        minzoom: BUILDINGS_MIN_ZOOM,
        paint: COLORED_BUILDING_PAINT,
      },
      beforeId,
    );
  }
}

function setBuildingLayersVisible(map: MapboxMap, visible: boolean) {
  const value = visible ? "visible" : "none";
  for (const id of [NATIVE_BUILDINGS_LAYER, COLORED_BUILDINGS_LAYER]) {
    if (!map.getLayer(id)) continue;
    try {
      map.setLayoutProperty(id, "visibility", value);
    } catch {
      /* ignore */
    }
  }
}

function syncNativeBuildingVisibility(map: MapboxMap, coloredCount: number) {
  if (!map.getLayer(NATIVE_BUILDINGS_LAYER)) return;
  const zoom = map.getZoom();
  const hideNative = zoom >= NATIVE_BUILDINGS_MIN_ZOOM && coloredCount >= 80;
  try {
    map.setLayoutProperty(NATIVE_BUILDINGS_LAYER, "visibility", hideNative ? "none" : "visible");
  } catch {
    /* ignore */
  }
}

function applyBuildings(
  map: MapboxMap,
  boroughGeo: GeoJSON.FeatureCollection,
  selectedBorough: string,
): number {
  const source = map.getSource(COLORED_BUILDINGS_SOURCE) as GeoJSONSource | undefined;
  if (!source || !map.isStyleLoaded()) return 0;

  const zones = buildBoroughZones(boroughGeo);
  const count = mergeViewportBuildings(map, zones);
  const session = getSessionBuildings();

  source.setData(colorizeLondonBuildings(session, boroughGeo, selectedBorough));
  syncNativeBuildingVisibility(map, session.length);
  return session.length;
}

/** City-mass + native Mapbox buildings + accumulative coloured footprints. */
export function attachBuildingLayers(
  map: MapboxMap,
  boroughGeo: GeoJSON.FeatureCollection,
  is3d: boolean,
  selectedBorough: string,
  onCacheProgress?: (progress: CacheProgress) => void,
): () => void {
  activeCleanup.get(map)?.();

  if (!is3d) {
    setBuildingLayersVisible(map, false);
    clearSessionBuildings();
    return () => undefined;
  }

  const refresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      ensureBuildingLayers(map);
      setBuildingLayersVisible(map, true);
      const count = applyBuildings(map, boroughGeo, selectedBorough);
      onCacheProgress?.({
        phase: "ready",
        step: 1,
        total: 1,
        count,
      });
    }, REFRESH_DEBOUNCE_MS);
  };

  const boot = () => {
    ensureBuildingLayers(map);
    setBuildingLayersVisible(map, true);
    refresh();
  };

  if (map.isStyleLoaded()) boot();
  else map.once("load", boot);

  map.on("moveend", refresh);
  map.on("idle", refresh);
  refresh();

  const cleanup = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    map.off("moveend", refresh);
    map.off("idle", refresh);
  };

  activeCleanup.set(map, cleanup);
  return cleanup;
}

export function syncBuildingColors(
  map: MapboxMap,
  boroughGeo: GeoJSON.FeatureCollection,
  selectedBorough: string,
) {
  const source = map.getSource(COLORED_BUILDINGS_SOURCE) as GeoJSONSource | undefined;
  const session = getSessionBuildings();
  if (!source || !session.length) return;
  source.setData(colorizeLondonBuildings(session, boroughGeo, selectedBorough));
}
