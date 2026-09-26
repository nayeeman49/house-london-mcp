import type { ReactNode } from "react";

type Props = { text: string };

export function ChatMarkdown({ text }: Props) {
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (/^[-*]\s/.test(trimmed) || trimmed.includes("\n- ") || trimmed.includes("\n* ")) {
          const items = trimmed.split(/\n/).filter((line) => /^[-*]\s/.test(line));
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 text-[var(--muted)]">
              {items.map((item, j) => (
                <li key={j}>{formatInline(item.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-[var(--text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--live)] hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}
