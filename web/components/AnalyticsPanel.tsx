"use client";

import { useEffect, useState } from "react";
import type { AppMetrics } from "@/lib/types";
import type { CaseDefinition } from "@/lib/cases";

type Props = {
  activeCase: CaseDefinition;
  metrics: AppMetrics;
  mcpStatus: "connected" | "checking" | "error";
  mcpTools: string[];
};

const LAYER_LABELS: Record<string, string> = {
  foundations: "Foundations",
  wheretobuild: "WTB",
  imd2025: "IMD",
  census2021_ltla: "Census",
  housing_in_london: "HiL",
};

export function AnalyticsPanel({ activeCase, metrics, mcpStatus, mcpTools }: Props) {
  const [loadedLayers, setLoadedLayers] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok || !d.sources) return;
        const names = (d.sources as Array<{ name: string; available: boolean }>)
          .filter((s) => s.available)
          .map((s) => LAYER_LABELS[s.name] ?? s.name);
        setLoadedLayers(names);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="panel p-5 h-full space-y-5">
      <div>
        <p className="section-label">Session</p>
        <h2 className="title-serif text-xl mt-1">Live metrics</h2>
        <p className="text-xs text-[var(--muted)] mt-1.5">{activeCase.subtitle}</p>
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4 space-y-2 bg-black/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">MCP server</span>
          <span
            className={`text-xs font-medium tracking-wide ${
              mcpStatus === "connected"
                ? "text-[var(--live)]"
                : mcpStatus === "error"
                  ? "text-[var(--error)]"
                  : "text-[var(--warn)]"
            }`}
          >
            {mcpStatus === "connected" ? "Connected" : mcpStatus === "error" ? "Error" : "Checking"}
          </span>
        </div>
        <p className="text-[10px] text-[var(--muted-dim)] font-mono tracking-wider">
          Housing-Intent-Engine
        </p>
        <p className="text-[10px] text-[var(--muted)]">{mcpTools.length} tools available</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Answered" value={String(metrics.processedCount)} />
        <Stat label="MCP calls" value={String(metrics.mcpCalls)} />
        <Stat label="Pitches ready" value={String(metrics.pitchesReady)} />
        <Stat label={activeCase.metricLabel} value={metrics.headlineStat ?? "—"} />
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--live-soft)]">
        <p className="section-label mb-2">Data source</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(loadedLayers.length ? loadedLayers : ["Foundations"]).map((label) => (
            <span key={label} className="badge badge-live text-[10px]">
              {label}
            </span>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          ~182k housing applications · 2022–2025
        </p>
        <a
          href="https://foreman.house-london.uk/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--live)] hover:underline mt-3 inline-block tracking-wide"
        >
          foreman.house-london.uk →
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{label}</p>
      <p className="stat-value truncate mt-0.5">{value}</p>
    </div>
  );
}
