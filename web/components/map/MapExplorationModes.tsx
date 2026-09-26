"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MapDataLayers } from "@/lib/map-metrics";
import {
  MAP_EXPLORATION_MODES,
  type MapExplorationMode,
} from "@/lib/map-exploration-modes";

type Props = {
  activeModeId: string | null;
  dataLayers: MapDataLayers;
  onSelect: (mode: MapExplorationMode) => void;
  onClear: () => void;
};

export function MapExplorationModes({
  activeModeId,
  dataLayers,
  onSelect,
  onClear,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeMode = activeModeId
    ? MAP_EXPLORATION_MODES.find((m) => m.id === activeModeId)
    : null;

  const scrollBy = useCallback((delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !activeModeId) return;
    const card = el.querySelector<HTMLElement>(`[data-mode-id="${activeModeId}"]`);
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeModeId]);

  return (
    <div className="map-explore-modes">
      <div className="map-explore-header">
        <div>
          <p className="section-label">Explore modes</p>
          <h2 className="font-serif text-lg font-normal mt-0.5">Scroll to compare lenses</h2>
        </div>
        <div className="map-explore-nav">
          <button
            type="button"
            className="map-explore-nav-btn"
            onClick={() => scrollBy(-160)}
            aria-label="Scroll modes left"
          >
            ←
          </button>
          <button
            type="button"
            className="map-explore-nav-btn"
            onClick={() => scrollBy(160)}
            aria-label="Scroll modes right"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="map-explore-scroller"
        role="tablist"
        aria-label="Map exploration modes"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            scrollerRef.current?.scrollBy({ left: e.deltaY, behavior: "auto" });
          }
        }}
      >
        {MAP_EXPLORATION_MODES.map((mode) => {
          const layerOk =
            !mode.requiresLayer || Boolean(dataLayers[mode.requiresLayer]);
          const active = activeModeId === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              data-mode-id={mode.id}
              aria-selected={active}
              disabled={!layerOk}
              title={!layerOk ? `Requires ${mode.requiresLayer} dataset` : mode.description}
              className={`map-explore-card ${active ? "map-explore-card-active" : ""} ${!layerOk ? "map-explore-card-disabled" : ""}`}
              onClick={() => onSelect(mode)}
            >
              <span className="map-explore-emoji" aria-hidden>
                {mode.emoji}
              </span>
              <span className="map-explore-label">{mode.label}</span>
              <span className="map-explore-desc">{mode.description}</span>
              {!layerOk ? (
                <span className="map-explore-badge">Dataset offline</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {activeMode ? (
        <div className="map-explore-active panel p-3 bg-black/25">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-[var(--live)]">
                {activeMode.emoji} {activeMode.label}
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                {activeMode.readMap}
              </p>
            </div>
            <button type="button" className="map-explore-clear" onClick={onClear}>
              Clear
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-[var(--muted-dim)] leading-relaxed">
          Pick a mode or scroll horizontally — the map recolours and filters update
          automatically.
        </p>
      )}
    </div>
  );
}
