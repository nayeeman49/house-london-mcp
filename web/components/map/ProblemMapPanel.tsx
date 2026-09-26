import Link from "next/link";
import { MAP_METRICS, type MapMetricId } from "@/lib/map-metrics";
import type { ProblemMapContext } from "@/lib/problem-tables";

type Props = {
  context: ProblemMapContext;
  metric: MapMetricId;
  borough: string;
  appSize: string;
  status: string;
  viewMode: "2d" | "3d";
  showPoints: boolean;
  postcode: string;
};

export function ProblemMapPanel({
  context,
  metric,
  borough,
  appSize,
  status,
  viewMode,
  showPoints,
  postcode,
}: Props) {
  const metricLabel = MAP_METRICS.find((m) => m.id === metric)?.label ?? metric;

  const settings = [
    `Colour: ${metricLabel}`,
    `View: ${viewMode === "3d" ? "3D extruded blocks" : "2D flat choropleth"}`,
    borough ? `Borough: ${borough}` : "Borough: all London",
    appSize ? `App size: ${appSize}` : null,
    status ? `Status: ${status}` : null,
    viewMode === "2d"
      ? showPoints
        ? "Application points: on"
        : "Application points: off"
      : "Application points: hidden (3D view)",
    postcode.trim() ? `Postcode: ${postcode.trim()}` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="problem-map-panel"
      style={{ borderColor: context.table.accent }}
    >
      <p className="section-label">Problem table {context.table.id}</p>
      <h3 className="font-serif text-lg font-normal mt-1 leading-snug">
        {context.table.title}
      </h3>
      <p className="problem-map-panel-question">{context.question.prompt}</p>

      <div className="problem-map-panel-block">
        <p className="section-label">How this map relates</p>
        <p className="problem-map-panel-text">{context.mapRelation}</p>
      </div>

      <div className="problem-map-panel-block">
        <p className="section-label">Current map settings</p>
        <ul className="problem-map-panel-settings">
          {settings.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <Link
        href={`/problems#${context.question.id}`}
        className="problem-map-panel-link"
      >
        Full analysis & sources ↗
      </Link>
    </div>
  );
}
