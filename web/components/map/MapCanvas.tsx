"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Popup, Source, type MapRef } from "react-map-gl/mapbox";
import type { Map as MapboxMap, MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { apply3dBasemap, applyFlatBasemap } from "@/lib/map-basemap";
import {
  attach3dOrbitControls,
  configure3dNavigation,
  restore2dNavigation,
} from "@/lib/map-orbit";
import { buildBoroughGeoJson } from "@/lib/borough-geojoin";
import {
  colorForValue,
  type BoroughMapRecord,
  type MapApplication,
  type MapMetricId,
  type MapPostcodeResult,
} from "@/lib/map-metrics";
import { ApplicationHoverContent, ApplicationPopupContent } from "./ApplicationPopup";
import { BoroughPopupContent } from "./BoroughPopup";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();

type Props = {
  boroughs: BoroughMapRecord[];
  applications: MapApplication[];
  metric: MapMetricId;
  metricInvert?: boolean;
  selectedBorough: string;
  postcodeLookup: MapPostcodeResult | null;
  showPoints: boolean;
  viewMode: "2d" | "3d";
};

type BoroughPopupState = {
  lng: number;
  lat: number;
  record: BoroughMapRecord;
};

type AppPopupState = {
  lng: number;
  lat: number;
  app: MapApplication;
};

export default function MapCanvas({
  boroughs,
  applications,
  metric,
  metricInvert,
  selectedBorough,
  postcodeLookup,
  showPoints,
  viewMode,
}: Props) {
  const is3d = viewMode === "3d";
  const boroughLayerId = is3d ? "borough-extrusion" : "borough-fill";
  const showApplicationPoints = showPoints && !is3d;
  const mapRef = useRef<MapRef>(null);
  const [baseGeo, setBaseGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [boroughPopup, setBoroughPopup] = useState<BoroughPopupState | null>(null);
  const [hoverApp, setHoverApp] = useState<AppPopupState | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppPopupState | null>(null);

  useEffect(() => {
    fetch("/geo/london-boroughs.geojson")
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => setBaseGeo(data))
      .catch(() => setBaseGeo(null));
  }, []);

  const boroughGeo = useMemo(() => {
    if (!baseGeo) return null;
    return buildBoroughGeoJson(
      baseGeo,
      boroughs,
      metric,
      metricInvert,
      colorForValue,
      is3d,
    );
  }, [baseGeo, boroughs, metric, metricInvert, is3d]);

  const appByIndex = useMemo(() => applications, [applications]);

  const pointsGeo = useMemo((): GeoJSON.FeatureCollection => {
    return {
      type: "FeatureCollection",
      features: applications.map((app, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [app.lng, app.lat] },
        properties: {
          app_index: i,
          id: app.reference ?? String(i),
          borough: app.borough,
          status: app.status ?? "",
          app_size: app.app_size ?? "",
          label: app.reference ?? app.status ?? "Application",
        },
      })),
    };
  }, [applications]);

  const highlightGeo = useMemo((): GeoJSON.FeatureCollection | null => {
    const target = selectedApp ?? hoverApp;
    if (!target) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [target.lng, target.lat] },
          properties: {},
        },
      ],
    };
  }, [hoverApp, selectedApp]);

  const appFromFeature = useCallback(
    (feature: GeoJSON.Feature): MapApplication | null => {
      const idx = feature.properties?.app_index;
      if (typeof idx !== "number") return null;
      return appByIndex[idx] ?? null;
    },
    [appByIndex],
  );

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const appFeature = event.features?.find((f) => f.layer.id === "application-dots");
      if (appFeature) {
        const app = appFromFeature(appFeature as GeoJSON.Feature);
        if (app) {
          setSelectedApp({ lng: event.lngLat.lng, lat: event.lngLat.lat, app });
          setBoroughPopup(null);
          setHoverApp(null);
          return;
        }
      }

      const boroughFeature = event.features?.find(
        (f) => f.layer.id === "borough-extrusion" || f.layer.id === "borough-fill",
      );
      if (!boroughFeature?.properties) return;
      const borough = String(boroughFeature.properties.borough);
      const record = boroughs.find((b) => b.borough === borough);
      if (!record) return;
      setSelectedApp(null);
      setBoroughPopup({ lng: event.lngLat.lng, lat: event.lngLat.lat, record });
    },
    [boroughs, appFromFeature],
  );

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const canvas = event.target.getCanvas();

      if (selectedApp) {
        canvas.style.cursor = "pointer";
        return;
      }

      const appFeature = event.features?.find((f) => f.layer.id === "application-dots");
      if (appFeature) {
        const app = appFromFeature(appFeature as GeoJSON.Feature);
        if (app) {
          setHoverApp({ lng: event.lngLat.lng, lat: event.lngLat.lat, app });
          canvas.style.cursor = "pointer";
          return;
        }
      }

      setHoverApp(null);
      const overBorough = event.features?.some(
        (f) => f.layer.id === "borough-extrusion" || f.layer.id === "borough-fill",
      );
      canvas.style.cursor = overBorough ? "pointer" : "";
    },
    [appFromFeature, selectedApp],
  );

  const onMouseLeave = useCallback(() => {
    setHoverApp(null);
  }, []);

  const flyCenter = useMemo(() => {
    if (postcodeLookup) {
      return {
        longitude: postcodeLookup.longitude,
        latitude: postcodeLookup.latitude,
        zoom: 13.5,
      };
    }
    if (selectedBorough) {
      const f = boroughGeo?.features.find(
        (x) => x.properties?.borough === selectedBorough,
      );
      if (f?.geometry) {
        const coords =
          f.geometry.type === "Polygon"
            ? f.geometry.coordinates[0][0]
            : f.geometry.coordinates[0][0][0];
        return {
          longitude: coords[0],
          latitude: coords[1],
          zoom: 11.5,
        };
      }
    }
    return {
      longitude: -0.1278,
      latitude: 51.5074,
      zoom: 10.2,
    };
  }, [postcodeLookup, selectedBorough, boroughGeo]);

  const camera = useMemo(
    () => ({
      pitch: is3d ? 58 : 0,
      bearing: is3d ? -20 : 0,
    }),
    [is3d],
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    let detachOrbit: (() => void) | undefined;

    if (is3d) {
      configure3dNavigation(map);
      detachOrbit = attach3dOrbitControls(map);
    } else {
      restore2dNavigation(map);
    }

    mapRef.current?.flyTo({
      center: [flyCenter.longitude, flyCenter.latitude],
      zoom: flyCenter.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      duration: 900,
    });

    return () => {
      detachOrbit?.();
    };
  }, [flyCenter, camera.pitch, camera.bearing, is3d]);

  useEffect(() => {
    setSelectedApp(null);
    setHoverApp(null);
  }, [applications, showPoints, is3d]);

  const configureBasemap = useCallback(
    (map: MapboxMap) => {
      if (is3d) apply3dBasemap(map);
      else applyFlatBasemap(map);
    },
    [is3d],
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (map.isStyleLoaded()) configureBasemap(map);
    else map.once("style.load", () => configureBasemap(map));
  }, [configureBasemap]);

  const onMapLoad = useCallback(
    (event: { target: MapboxMap }) => {
      const map = event.target;
      configureBasemap(map);
      map.on("style.load", () => configureBasemap(map));
    },
    [configureBasemap],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[var(--muted)] p-6 text-center">
        Set <code className="text-[var(--text)]">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
        <code className="text-[var(--text)]">.env.local</code> for the 3D borough map.
      </div>
    );
  }

  if (!boroughGeo) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[var(--muted)]">
        Loading borough boundaries…
      </div>
    );
  }

  const boroughOpacity: mapboxgl.ExpressionSpecification = selectedBorough
    ? ["case", ["==", ["get", "borough"], selectedBorough], 0.92, 0.22]
    : 0.82;

  const interactiveLayers =
    showApplicationPoints && applications.length > 0
      ? ["application-dots", boroughLayerId]
      : [boroughLayerId];

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        ...flyCenter,
        pitch: camera.pitch,
        bearing: camera.bearing,
      }}
      dragPan={!is3d}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={is3d}
      maxPitch={is3d ? 85 : 0}
      minPitch={0}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      onLoad={onMapLoad}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      interactiveLayerIds={interactiveLayers}
      cursor="default"
      attributionControl={false}
    >
      <Source id="boroughs" type="geojson" data={boroughGeo} key={is3d ? "boroughs-3d" : "boroughs-2d"}>
        <Layer
          id="borough-extrusion"
          type="fill-extrusion"
          layout={{ visibility: is3d ? "visible" : "none" }}
          paint={{
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": boroughOpacity,
            "fill-extrusion-vertical-gradient": true,
          }}
        />
        <Layer
          id="borough-fill"
          type="fill"
          layout={{ visibility: is3d ? "none" : "visible" }}
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": boroughOpacity,
          }}
        />
        <Layer
          id="borough-outline"
          type="line"
          paint={{
            "line-color": "#e8e4dc",
            "line-width": selectedBorough
              ? ["case", ["==", ["get", "borough"], selectedBorough], 2.5, 0.8]
              : 1.2,
            "line-opacity": 0.9,
          }}
        />
      </Source>

      {showApplicationPoints && applications.length > 0 && (
        <Source id="applications" type="geojson" data={pointsGeo}>
          <Layer
            id="application-dots"
            type="circle"
            paint={{
              "circle-radius": 4,
              "circle-color": [
                "match",
                ["get", "status"],
                "Permitted",
                "#6ee7a0",
                "Rejected",
                "#f87171",
                "Withdrawn",
                "#a8a29e",
                "Pending",
                "#fbbf24",
                "#6ee7a0",
              ],
              "circle-opacity": 0.75,
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#e8e4dc",
            }}
          />
          <Layer
            id="application-labels"
            type="symbol"
            minzoom={12}
            layout={{
              "text-field": ["get", "label"],
              "text-size": 10,
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-max-width": 12,
              "text-allow-overlap": false,
            }}
            paint={{
              "text-color": "#e8e4dc",
              "text-halo-color": "#0a0a0a",
              "text-halo-width": 1.2,
              "text-opacity": 0.85,
            }}
          />
        </Source>
      )}

      {highlightGeo && (
        <Source id="app-highlight" type="geojson" data={highlightGeo}>
          <Layer
            id="app-highlight-ring"
            type="circle"
            paint={{
              "circle-radius": 10,
              "circle-color": "#fbbf24",
              "circle-opacity": 0.25,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fbbf24",
            }}
          />
        </Source>
      )}

      {postcodeLookup && (
        <Source
          id="postcode"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [postcodeLookup.longitude, postcodeLookup.latitude],
                },
                properties: { postcode: postcodeLookup.postcode },
              },
            ],
          }}
        >
          <Layer
            id="postcode-marker"
            type="circle"
            paint={{
              "circle-radius": 9,
              "circle-color": "#fbbf24",
              "circle-opacity": 0.35,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fbbf24",
            }}
          />
        </Source>
      )}

      {hoverApp && !selectedApp && (
        <Popup
          longitude={hoverApp.lng}
          latitude={hoverApp.lat}
          anchor="bottom"
          closeButton={false}
          closeOnClick={false}
          offset={12}
          className="mapbox-popup-dark mapbox-popup-hover"
        >
          <ApplicationHoverContent app={hoverApp.app} />
        </Popup>
      )}

      {selectedApp && (
        <Popup
          longitude={selectedApp.lng}
          latitude={selectedApp.lat}
          anchor="bottom"
          onClose={() => setSelectedApp(null)}
          closeButton
          className="mapbox-popup-dark"
        >
          <ApplicationPopupContent app={selectedApp.app} />
        </Popup>
      )}

      {boroughPopup && (
        <Popup
          longitude={boroughPopup.lng}
          latitude={boroughPopup.lat}
          anchor="bottom"
          onClose={() => setBoroughPopup(null)}
          closeButton
          className="mapbox-popup-dark"
        >
          <BoroughPopupContent record={boroughPopup.record} />
        </Popup>
      )}
    </Map>
  );
}
