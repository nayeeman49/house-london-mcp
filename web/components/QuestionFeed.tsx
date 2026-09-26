import type { PolicyQuestion } from "@/lib/types";

type Props = {
  questions: PolicyQuestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  answeredIds: Set<string>;
};

export function QuestionFeed({ questions, selectedId, onSelect, answeredIds }: Props) {
  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="mb-5">
        <p className="section-label">Inbox</p>
        <h2 className="title-serif text-xl mt-1">Policy questions</h2>
        <p className="text-xs text-[var(--muted)] mt-1.5">
          {questions.length} questions in this story
        </p>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {questions.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(q.id)}
            className={`w-full text-left rounded-lg border p-3.5 transition panel-hover ${
              selectedId === q.id ? "inbox-item-active" : "border-[var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-[var(--text)]">{q.asker}</span>
              {answeredIds.has(q.id) ? (
                <span className="badge badge-live">Analysed</span>
              ) : null}
            </div>
            <p className="text-[10px] text-[var(--muted)] mb-1.5 tracking-wide uppercase">
              {q.role} · {q.tagLabel}
            </p>
            <p className="text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">{q.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
