import type { EvidenceCard as EvidenceCardType } from "@/lib/types";

export function EvidenceCardView({ card }: { card: EvidenceCardType }) {
  return (
    <div className="panel p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label mb-2">Evidence card</p>
          <h3 className="font-serif text-xl font-normal leading-snug">{card.headline}</h3>
        </div>
        <span className="badge badge-live shrink-0">
          {card.source === "mcp" ? "Live" : card.source}
        </span>
      </div>

      <div className="grid gap-4 text-sm border-t border-[var(--border)] pt-4">
        <Field label="Mechanism" value={card.mechanism} />
        <Field label="Data" value={card.dataSource} />
        <Field label="Policy ask" value={card.policyAsk} highlight />
        {card.caveat ? <Field label="Caveat" value={card.caveat} muted /> : null}
        {card.mcpTool ? (
          <p className="text-[10px] text-[var(--muted-dim)] font-mono tracking-wider pt-1">
            {card.mcpTool}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="section-label mb-1">{label}</p>
      <p
        className={
          highlight
            ? "text-[var(--text)] font-medium leading-relaxed"
            : muted
              ? "text-[var(--muted-dim)] italic leading-relaxed"
              : "text-[var(--muted)] leading-relaxed"
        }
      >
        {value}
      </p>
    </div>
  );
}
