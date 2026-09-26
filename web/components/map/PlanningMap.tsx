"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GEOJSON_EXCLUDED_BOROUGHS } from "@/lib/boroughs";
import { BOROUGH_NAMES } from "@/lib/borough-centroids";
import {
  resolveProblemMapContext,
  type ProblemMapContext,
  type ProblemTableId,
} from "@/lib/problem-tables";
import {
  MAP_METRICS,
  type BoroughMapRecord,
  type MapApplication,
  type MapDataLayers,
  type MapMetricId,
  type MapPostcodeResult,
} from "@/lib/map-metrics";
import {
  applyExplorationMode,
  getExplorationMode,
  type MapExplorationMode,
} from "@/lib/map-exploration-modes";
import { MapExplorationModes } from "./MapExplorationModes";
import { MapInfoBox } from "./MapInfoBox";
import { ProblemMapPanel } from "./ProblemMapPanel";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-[var(--muted)] text-sm">
      Loading map…
    </div>
  ),
});

const APP_SIZES = ["", "Small", "Medium", "Large"];
const STATUSES = ["", "Permitted", "Rejected", "Withdrawn", "Pending"];

const VALID_METRICS = new Set(MAP_METRICS.map((m) => m.id));
const VALID_STATUSES = new Set(["Permitted", "Rejected", "Withdrawn", "Pending"]);
const VALID_SIZES = new Set(["Small", "Medium", "Large"]);
const VALID_TABLES = new Set(["A", "B", "C", "D", "E", "F", "G"]);
const VALID_MODES = new Set(
  [
    "most-desirable",
    "highest-demand",
    "approval-friendly",
    "planning-friction",
    "deadline-pressure",
    "repeat-sites",
    "consultation-heavy",
    "stock-stalled",
    "rejection-hotspots",
    "population-pressure",
  ] as const,
);

type PlanItRecord = {
  description?: string;
  status?: string;
  address?: string;
  link?: string;
};

export function PlanningMap() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlReady = useRef(false);
  const [boroughs, setBoroughs] = useState<BoroughMapRecord[]>([]);
  const [applications, setApplications] = useState<MapApplication[]>([]);
  const [postcodeLookup, setPostcodeLookup] = useState<MapPostcodeResult | null>(null);
  const [planitApplications, setPlanitApplications] = useState<PlanItRecord[]>([]);
  const [metric, setMetric] = useState<MapMetricId>("approval_rate");
  const [borough, setBorough] = useState("");
  const [appSize, setAppSize] = useState("");
  const [status, setStatus] = useState("");
  const [showPoints, setShowPoints] = useState(true);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("2d");
  const [postcode, setPostcode] = useState("");
  const [planitSearch, setPlanitSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [problemContext, setProblemContext] = useState<ProblemMapContext | null>(null);
  const [dataLayers, setDataLayers] = useState<MapDataLayers>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explorationModeId, setExplorationModeId] = useState<string | null>(null);

  const activeMetric = MAP_METRICS.find((m) => m.id === metric) ?? MAP_METRICS[0];
  const activeExploreMode = explorationModeId
    ? getExplorationMode(explorationModeId)
    : null;

  const applyExploreMode = useCallback((mode: MapExplorationMode) => {
    const applied = applyExplorationMode(mode);
    setExplorationModeId(mode.id);
    setMetric(applied.metric);
    setViewMode(applied.viewMode);
    setShowPoints(applied.showPoints);
    setStatus(applied.status);
    setAppSize(applied.appSize);
    setBorough(applied.borough);
  }, []);

  const clearExploreMode = useCallback(() => {
    setExplorationModeId(null);
  }, []);

  const clearModeIfManual = useCallback(() => {
    setExplorationModeId(null);
  }, []);

  useEffect(() => {
    const m = searchParams.get("metric");
    if (m && VALID_METRICS.has(m as MapMetricId)) {
      setMetric(m as MapMetricId);
    }

    const b = searchParams.get("borough");
    if (b && BOROUGH_NAMES.includes(b)) setBorough(b);

    const s = searchParams.get("status");
    if (s && VALID_STATUSES.has(s)) setStatus(s);

    const size = searchParams.get("appSize");
    if (size && VALID_SIZES.has(size)) setAppSize(size);

    const table = searchParams.get("table");
    const view = searchParams.get("view");

    // Problem case maps always open in 2D; plain /map respects ?view=
    if (table && VALID_TABLES.has(table)) {
      setViewMode("2d");
    } else if (view === "2d" || view === "3d") {
      setViewMode(view);
    }

    const points = searchParams.get("points");
    if (points === "false") setShowPoints(false);
    if (points === "true") setShowPoints(true);

    const pc = searchParams.get("postcode");
    if (pc) setPostcode(pc);

    const problem = searchParams.get("problem") ?? undefined;
    if (table && VALID_TABLES.has(table)) {
      setProblemContext(
        resolveProblemMapContext(
          table as ProblemTableId,
          problem,
          m && VALID_METRICS.has(m as MapMetricId) ? m : undefined,
        ),
      );
    } else {
      setProblemContext(null);
    }

    setPlanitSearch(searchParams.get("planit") === "true");

    const explore = searchParams.get("mode");
    if (explore && VALID_MODES.has(explore)) {
      const mode = getExplorationMode(explore);
      if (mode) {
        const applied = applyExplorationMode(mode);
        setExplorationModeId(mode.id);
        setMetric(applied.metric);
        setViewMode(applied.viewMode);
        setShowPoints(applied.showPoints);
        setStatus(applied.status);
        setAppSize(applied.appSize);
        setBorough(applied.borough);
      }
    }

    urlReady.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!urlReady.current) return;

    const params = new URLSearchParams();
    const table = searchParams.get("table");
    const problem = searchParams.get("problem");
    if (table) params.set("table", table);
    if (problem) params.set("problem", problem);
    if (metric !== "approval_rate") params.set("metric", metric);
    if (borough) params.set("borough", borough);
    if (appSize) params.set("appSize", appSize);
    if (status) params.set("status", status);
    if (viewMode !== "2d") params.set("view", viewMode);
    if (!showPoints) params.set("points", "false");
    if (postcode.trim()) params.set("postcode", postcode.trim());
    if (planitSearch && postcode.trim()) params.set("planit", "true");
    if (explorationModeId) params.set("mode", explorationModeId);

    const qs = params.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    metric,
    borough,
    appSize,
    status,
    showPoints,
    viewMode,
    postcode,
    planitSearch,
    explorationModeId,
    pathname,
    router,
    searchParams,
  ]);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        showPoints: String(showPoints),
        limit: "500",
      });
      if (borough) params.set("borough", borough);
      if (appSize) params.set("appSize", appSize);
      if (status) params.set("status", status);
      if (postcode.trim()) params.set("postcode", postcode.trim());
      if (planitSearch && postcode.trim()) params.set("planit", "true");

      const res = await fetch(`/api/map?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Failed to load map data");

      setBoroughs(data.boroughs ?? []);
      setApplications(data.applications ?? []);
      setPostcodeLookup(data.postcodeLookup ?? null);
      setPlanitApplications((data.planitApplications as PlanItRecord[]) ?? []);
      setDataLayers(data.data_layers ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Map load failed");
    } finally {
      setLoading(false);
    }
  }, [borough, appSize, status, showPoints, postcode, planitSearch]);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  const legend = useMemo(() => {
    const values = boroughs
      .map((b) => {
        const v = b[metric];
        return typeof v === "number" ? v : null;
      })
      .filter((v): v is number => v !== null);
    if (!values.length) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mid = (min + max) / 2;
    return {
      low: activeMetric.format(min),
      mid: activeMetric.format(mid),
      high: activeMetric.format(max),
    };
  }, [boroughs, metric, activeMetric]);

  return (
    <div className="map-layout">
      <button
        type="button"
        className="map-sidebar-toggle lg:hidden"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? "Hide filters" : "Show filters"}
      </button>
      <aside
        className={`map-sidebar panel p-5 space-y-5 overflow-y-auto ${sidebarOpen ? "map-sidebar-open" : ""}`}
      >
        {problemContext ? (
          <ProblemMapPanel
            context={problemContext}
            metric={metric}
            borough={borough}
            appSize={appSize}
            status={status}
            viewMode={viewMode}
            showPoints={showPoints}
            postcode={postcode}
          />
        ) : null}

        <MapExplorationModes
          activeModeId={explorationModeId}
          dataLayers={dataLayers}
          onSelect={applyExploreMode}
          onClear={clearExploreMode}
        />

        <div>
          <p className="section-label">Filters</p>
          <h2 className="font-serif text-xl font-normal mt-1">Map queries</h2>
          <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
            {viewMode === "3d"
              ? "3D borough blocks — left-drag to orbit (tilt + spin), right-drag to pan, scroll to zoom."
              : "2D choropleth — borough colour by metric. Pan and zoom as usual."}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              ["census2021", "Census", "Census 2021 borough counts"],
              ["imd2025", "IMD", "IMD 2025 deprivation layer"],
              ["housing_in_london", "HiL", "GLA Housing in London indicators"],
              [
                "wheretobuild",
                "WTB",
                "Warwick WhereToBuild — hackathon parquet only (not public download)",
              ],
            ].map(([key, label, title]) => (
              <span
                key={key}
                title={title}
                className={`badge ${dataLayers[key as keyof MapDataLayers] ? "badge-live" : ""}`}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[var(--muted-dim)] mt-2">
            GeoJSON covers 33 boroughs. Foundations also includes{" "}
            {GEOJSON_EXCLUDED_BOROUGHS.join(" and ")} (no polygon on this map).
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="section-label">Colour by</span>
          <select
            value={metric}
            onChange={(e) => {
              clearModeIfManual();
              setMetric(e.target.value as MapMetricId);
            }}
            className="input-field"
          >
            {MAP_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[var(--muted-dim)]">
            Source: {activeMetric.source}
          </p>
        </label>

        <label className="block space-y-1.5">
          <span className="section-label">Borough</span>
          <select
            value={borough}
            onChange={(e) => {
              clearModeIfManual();
              setBorough(e.target.value);
            }}
            className="input-field"
          >
            <option value="">All London</option>
            {BOROUGH_NAMES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="section-label">App size</span>
          <select
            value={appSize}
            onChange={(e) => {
              clearModeIfManual();
              setAppSize(e.target.value);
            }}
            className="input-field"
          >
            <option value="">All sizes</option>
            {APP_SIZES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="section-label">Status</span>
          <select
            value={status}
            onChange={(e) => {
              clearModeIfManual();
              setStatus(e.target.value);
            }}
            className="input-field"
          >
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5">
          <span className="section-label">View</span>
          <div className="map-view-toggle">
            <button
              type="button"
              className={viewMode === "3d" ? "map-view-btn map-view-btn-active" : "map-view-btn"}
              onClick={() => {
                clearModeIfManual();
                setViewMode("3d");
              }}
            >
              3D
            </button>
            <button
              type="button"
              className={viewMode === "2d" ? "map-view-btn map-view-btn-active" : "map-view-btn"}
              onClick={() => {
                clearModeIfManual();
                setViewMode("2d");
              }}
            >
              2D
            </button>
          </div>
        </div>

        <label
          className={`flex items-center gap-2 text-sm cursor-pointer ${viewMode === "3d" ? "text-[var(--muted-dim)]" : "text-[var(--muted)]"}`}
        >
          <input
            type="checkbox"
            checked={showPoints}
            disabled={viewMode === "3d"}
            onChange={(e) => {
              clearModeIfManual();
              setShowPoints(e.target.checked);
            }}
            className="rounded border-[var(--border)]"
          />
          Show application points
          {viewMode === "3d" ? (
            <span className="text-[10px] text-[var(--muted-dim)]">(2D only)</span>
          ) : null}
        </label>

        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <span className="section-label">Postcode lookup</span>
          <div className="flex gap-2">
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="e.g. SE1 7PB"
              className="input-field flex-1"
            />
            <button
              type="button"
              className="btn-primary shrink-0"
              onClick={() => void loadMap()}
            >
              Go
            </button>
          </div>
          <p className="text-[10px] text-[var(--muted-dim)]">
            Uses MCP constraint search — shows planning constraints at location.
          </p>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={planitSearch}
              disabled={!postcode.trim()}
              onChange={(e) => setPlanitSearch(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            Also search PlanIt live applications
          </label>
          {planitApplications.length > 0 ? (
            <ul className="text-[10px] text-[var(--muted)] space-y-1 mt-2 max-h-28 overflow-y-auto">
              {planitApplications.map((app, i) => (
                <li key={i}>
                  {app.link ? (
                    <a href={app.link} target="_blank" rel="noreferrer" className="text-[var(--live)] hover:underline">
                      {app.status ?? "PlanIt"}
                    </a>
                  ) : (
                    (app.status ?? "PlanIt")
                  )}
                  {": "}
                  {(app.description ?? app.address ?? "").slice(0, 60)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => void loadMap()}
        >
          {loading ? "Refreshing…" : "Apply filters"}
        </button>

        {error && <p className="text-xs text-[var(--error)]">{error}</p>}

        {legend && (
          <div className="rounded-lg border border-[var(--border)] p-3 bg-black/20 space-y-2">
            <p className="section-label">Legend · {activeMetric.label}</p>
            <div className="h-2 rounded-full map-legend-gradient" />
            <div className="flex justify-between text-[10px] text-[var(--muted)]">
              <span>{activeMetric.invert ? legend.high : legend.low}</span>
              <span>{legend.mid}</span>
              <span>{activeMetric.invert ? legend.low : legend.high}</span>
            </div>
            <p className="text-[10px] text-[var(--muted-dim)]">
              {activeExploreMode?.readMap ??
                (viewMode === "3d"
                  ? "Taller red blocks = higher values on this metric"
                  : "Red = higher values on this metric (flat choropleth)")}
              {" · "}
              {boroughs.length} boroughs
              {viewMode === "2d" && showPoints && applications.length
                ? ` · ${applications.length} points (hover/click)`
                : ""}
            </p>
          </div>
        )}
      </aside>

      <div className="map-main panel overflow-hidden relative min-h-[420px]">
        {activeExploreMode ? (
          <div className="map-mode-pill" aria-live="polite">
            <span className="map-mode-pill-emoji">{activeExploreMode.emoji}</span>
            <span className="map-mode-pill-label">{activeExploreMode.label}</span>
          </div>
        ) : null}
        <MapInfoBox />
        {loading && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-black/40 text-sm text-[var(--muted)]">
            <span className="animate-pulse">Loading MCP data…</span>
            <span className="text-[10px] text-[var(--muted-dim)]">
              First load may take a few seconds while Foundations parquet is read
            </span>
          </div>
        )}
        <MapCanvas
          boroughs={boroughs}
          applications={applications}
          metric={metric}
          metricInvert={activeMetric.invert}
          selectedBorough={borough}
          postcodeLookup={postcodeLookup}
          showPoints={showPoints}
          viewMode={viewMode}
        />
      </div>
    </div>
  );
}
