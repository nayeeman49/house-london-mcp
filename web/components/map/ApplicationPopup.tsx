import type { MapApplication } from "@/lib/map-metrics";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p>
      <span className="text-[10px] uppercase tracking-wider text-[#7a7974]">{label}: </span>
      {value}
    </p>
  );
}

export function ApplicationHoverContent({ app }: { app: MapApplication }) {
  return (
    <div className="text-xs space-y-0.5 min-w-[160px] text-[#f2f0eb]">
      <p className="font-medium text-sm">{app.reference ?? "Application"}</p>
      <p className="text-[#a8a59e]">{app.borough}</p>
      <p>
        <span className="text-[#7a7974]">Status: </span>
        {app.status ?? "Unknown"}
        {app.app_size ? ` · ${app.app_size}` : ""}
      </p>
      <p className="text-[10px] text-[#7a7974] pt-0.5">Click for full details</p>
    </div>
  );
}

export function ApplicationPopupContent({ app }: { app: MapApplication }) {
  const desc =
    app.description && app.description.length > 220
      ? `${app.description.slice(0, 220)}…`
      : app.description;

  return (
    <div className="text-sm space-y-1 min-w-[240px] max-w-[280px] text-[#f2f0eb]">
      <p className="font-semibold text-base leading-snug">{app.reference ?? "Application"}</p>
      <p className="text-[10px] uppercase tracking-wider text-[#7a7974] pt-1">Foundations</p>
      <Field label="Borough" value={app.borough} />
      <Field label="Status" value={app.status} />
      <Field label="Size" value={app.app_size} />
      <Field
        label="Decision time"
        value={app.days_to_decision != null ? `${app.days_to_decision} days` : null}
      />
      <Field
        label="Dwellings"
        value={app.n_dwellings != null ? String(app.n_dwellings) : null}
      />
      {desc ? (
        <p className="pt-2 text-xs text-[#c4c1ba] leading-relaxed border-t border-[#333] mt-2">
          {desc}
        </p>
      ) : null}
    </div>
  );
}
