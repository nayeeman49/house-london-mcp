import type { Map as MapboxMap } from "mapbox-gl";
import { isBuildingLayer, removeBuildingLayers } from "./map-buildings";

const OUR_LAYERS = new Set([
  "borough-extrusion",
  "borough-fill",
  "borough-outline",
  "borough-city-mass",
]);

export function buildBoroughFillOpacity(
  is3d: boolean,
  selectedBorough: string,
): mapboxgl.ExpressionSpecification | number {
  if (!is3d) {
    return selectedBorough
      ? ["case", ["==", ["get", "borough"], selectedBorough], 0.92, 0.22]
      : 0.82;
  }

  // Flat fill hidden in 3D — coloured extrusions carry the metric.
  return 0;
}

export function syncBoroughLayers(map: MapboxMap, is3d: boolean) {
  try {
    if (map.getLayer("borough-extrusion")) {
      map.setLayoutProperty("borough-extrusion", "visibility", "none");
    }
    if (map.getLayer("borough-fill")) {
      map.setLayoutProperty("borough-fill", "visibility", "visible");
    }
  } catch {
    /* layers not mounted yet */
  }
}

function hideStyle3dLayers(map: MapboxMap) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (OUR_LAYERS.has(layer.id) || isBuildingLayer(layer.id)) continue;

    const is3dLayer =
      layer.type === "fill-extrusion" ||
      layer.id.includes("building") ||
      layer.id.includes("3d") ||
      layer.type === "hillshade";

    if (is3dLayer) {
      try {
        map.setLayoutProperty(layer.id, "visibility", "none");
      } catch {
        /* ignore */
      }
    }
  }
}

export function applyFlatBasemap(map: MapboxMap) {
  map.setTerrain(null);
  syncBoroughLayers(map, false);
  removeBuildingLayers(map);
  hideStyle3dLayers(map);
}

export function apply3dBasemap(map: MapboxMap) {
  syncBoroughLayers(map, true);
  hideStyle3dLayers(map);
}
