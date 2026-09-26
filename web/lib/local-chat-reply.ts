import { isDocumentCountQuestion } from "./data-quality";
import type { McpContextBundle } from "./mcp-context";

function pct(value: number | null | undefined): string {
  if (value == null) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

/** Rich conversational reply from MCP data only — no OpenAI required. */
export function buildLocalChatReply(
  userMessage: string,
  bundle: McpContextBundle,
): string {
  const card = bundle.evidenceCard;
  const parts: string[] = [];
  const isMeta = card.mcpTool === "list_data_sources";

  if (isMeta) {
    parts.push(`**${card.headline}**`);
    parts.push("");
    parts.push(card.replyText);
    if (isDocumentCountQuestion(userMessage)) {
      parts.push("");
      parts.push(
        "If you meant project documentation rather than n_documents, say so — I can walk through the README and MCP tool list instead.",
      );
    } else {
      parts.push("");
      parts.push(
        'If you meant planning documents per application (n_documents), ask e.g. "how many documents per app in Lambeth?"',
      );
    }
    parts.push("");
    parts.push(`**Caveats:** ${card.caveat}`);
    parts.push("");
    parts.push(`_Source: ${card.dataSource}_`);
    return parts.join("\n");
  }

  parts.push(`**${card.headline}**`);
  parts.push("");
  parts.push(card.replyText);

  const repeat = bundle.toolsUsed.find((t) => t.tool === "get_repeat_application_burden")?.result;
  const deadline = bundle.toolsUsed.find((t) => t.tool === "get_deadline_bunching_by_borough")?.result;
  const small = bundle.toolsUsed.find((t) => t.tool === "get_small_site_approval_gap")?.result;
  const friction = bundle.toolsUsed.find((t) => t.tool === "get_planning_friction_by_borough")?.result;

  const extras: string[] = [];

  if (repeat && card.mcpTool !== "get_repeat_application_burden") {
    extras.push(
      `Repeat applications: ${pct(repeat.repeat_application_share as number)} of apps sit at sites with 2+ prior applications (${(repeat.repeat_applications as number)?.toLocaleString()} apps).`,
    );
  }

  if (deadline && card.mcpTool !== "get_deadline_bunching_by_borough") {
    const b = (deadline.borough as string) ?? "London";
    extras.push(
      `Deadline bunching (${b}): ${pct(deadline.deadline_day_share as number)} decide on the statutory deadline; approval ${pct(deadline.approval_rate_on_deadline as number)} on deadline vs ${pct(deadline.approval_rate_well_before_deadline as number)} well before.`,
    );
  }

  if (small && card.mcpTool !== "get_small_site_approval_gap") {
    const outer = small.outer_london as { approval_rate: number };
    const inner = small.inner_london as { approval_rate: number };
    extras.push(
      `Small sites: outer London submits ${pct(small.outer_share_of_small_applications as number)} of small apps; approval rates outer ${pct(outer?.approval_rate)} vs inner ${pct(inner?.approval_rate)}.`,
    );
  }

  if (friction && card.mcpTool !== "get_planning_friction_by_borough") {
    extras.push(
      `${friction.borough}: ${friction.avg_decision_delay_days} days avg decision time, ${pct(friction.approval_rate as number)} approval rate.`,
    );
  }

  if (extras.length) {
    parts.push("");
    parts.push("**Related metrics from the same MCP pull:**");
    extras.forEach((e) => parts.push(`• ${e}`));
  }

  parts.push("");
  parts.push(`**Mechanism:** ${card.mechanism}`);
  parts.push("");
  parts.push(`**Policy ask:** ${card.policyAsk}`);

  if (card.caveat) {
    parts.push("");
    parts.push(`*Caveat: ${card.caveat}*`);
  }

  if (/pitch|2-minute|headline|open with/i.test(userMessage)) {
    parts.push("");
    parts.push(
      `**Suggested pitch opener:** "${card.headline.split("—")[0].trim()}"`,
    );
  }

  parts.push("");
  parts.push(
    `_Source: Foundations via Housing Intent Engine MCP · tools: ${bundle.toolsUsed.map((t) => t.tool).join(", ")}_`,
  );

  return parts.join("\n");
}

export function openAiErrorNotice(status: number, errText: string): string {
  if (status === 429) {
    if (/no credits|insufficient_quota|billing/i.test(errText)) {
      return "OpenAI credits exhausted — using live MCP data only (still accurate). Add credits at platform.openai.com or set USE_MCP_ONLY=true in .env.local.";
    }
    return "OpenAI rate limit — using live MCP data only. Try again in a minute.";
  }
  if (status === 401) {
    return "Invalid OpenAI API key — using live MCP data only. Check web/.env.local.";
  }
  return `OpenAI unavailable (${status}) — answer uses live MCP data only.`;
}

export function shouldSkipOpenAi(): boolean {
  return process.env.USE_MCP_ONLY === "true" || process.env.OPENAI_API_KEY === "";
}
