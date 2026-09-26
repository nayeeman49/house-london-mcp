"use client";

import { useEffect, useState } from "react";
import { TABLE_LIVE_STATS } from "@/lib/problem-table-stats";
import type { ProblemTableId } from "@/lib/problem-tables";

type Props = {
  tableId: ProblemTableId;
  accent: string;
};

export function ProblemLiveStat({ tableId, accent }: Props) {
  const [stat, setStat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const config = TABLE_LIVE_STATS[tableId];
    setLoading(true);
    fetch("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: config.tool, arguments: config.arguments }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const text = config.format(d.result as Record<string, unknown>);
        if (text) setStat(text);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [tableId]);

  if (loading) {
    return (
      <p className="problem-live-stat problem-live-stat-loading" style={{ borderColor: accent }}>
        Loading live stat…
      </p>
    );
  }

  if (!stat) return null;

  return (
    <p className="problem-live-stat" style={{ borderColor: accent }}>
      <span className="problem-live-stat-label">Live from MCP</span>
      {stat}
    </p>
  );
}
