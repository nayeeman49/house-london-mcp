import type { CaseDefinition, CaseId } from "@/lib/cases";

type Props = {
  cases: CaseDefinition[];
  activeCaseId: CaseId;
  onCaseChange: (id: CaseId) => void;
  onExportPitch: () => void;
  onDownloadPitch?: () => void;
};

export function DashboardHeader({
  cases,
  activeCaseId,
  onCaseChange,
  onExportPitch,
  onDownloadPitch,
}: Props) {
  return (
    <header className="panel p-5 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <p className="eyebrow">Evidence desk</p>
          <h1 className="title-serif title-serif-lg text-3xl mt-2">
            Planning briefs
          </h1>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-md">
            Policy questions answered from live Foundations data via the Housing Intent Engine.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cases.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCaseChange(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs border transition ${
                activeCaseId === c.id
                  ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              }`}
            >
              {c.label}
            </button>
          ))}
          <button type="button" onClick={onExportPitch} className="btn-primary text-xs ml-1">
            Copy pitch
          </button>
          {onDownloadPitch ? (
            <button type="button" onClick={onDownloadPitch} className="btn-ghost text-xs">
              Download .txt
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
