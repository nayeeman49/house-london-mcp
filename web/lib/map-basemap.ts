import type { Map as MapboxMap } from "mapbox-gl";

const OUR_LAYERS = new Set(["borough-extrusion", "borough-fill", "borough-outline"]);

/** Toggle borough data layers — extrusion in 3D, flat fill in 2D. */
export function syncBoroughLayers(map: MapboxMap, is3d: boolean) {
  try {
    if (map.getLayer("borough-extrusion")) {
      map.setLayoutProperty("borough-extrusion", "visibility", is3d ? "visible" : "none");
    }
    if (map.getLayer("borough-fill")) {
      map.setLayoutProperty("borough-fill", "visibility", is3d ? "none" : "visible");
    }
  } catch {
    /* layers not mounted yet */
  }
}

/** Hide Mapbox 3D buildings, terrain, and hillshade for a flat 2D view. */
export function applyFlatBasemap(map: MapboxMap) {
  map.setTerrain(null);
  syncBoroughLayers(map, false);

  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (OUR_LAYERS.has(layer.id)) continue;

    const is3dLayer =
      layer.type === "fill-extrusion" ||
      layer.id.includes("building") ||
      layer.id.includes("3d") ||
      layer.type === "hillshade";

    if (is3dLayer) {
      try {
        map.setLayoutProperty(layer.id, "visibility", "none");
      } catch {
        /* layer may not support visibility */
      }
    }
  }
}

/** Restore default basemap 3D layers when returning to 3D mode. */
export function apply3dBasemap(map: MapboxMap) {
  syncBoroughLayers(map, true);

  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (OUR_LAYERS.has(layer.id)) continue;

    const is3dLayer =
      layer.type === "fill-extrusion" ||
      layer.id.includes("building") ||
      layer.id.includes("3d") ||
      layer.type === "hillshade";

    if (is3dLayer) {
      try {
        map.setLayoutProperty(layer.id, "visibility", "visible");
      } catch {
        /* ignore */
      }
    }
  }
}
