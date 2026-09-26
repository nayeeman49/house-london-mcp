import {
  buildMetaEvidenceCard,
  isDocumentCountQuestion,
  isMetaQuestion,
} from "./data-quality";
import { buildEvidenceFromMcp, toolPlanForQuestion } from "./evidence-engine";
import { LONDON_BOROUGHS } from "./boroughs";
import { callMcpTool } from "./mcp-client";
import type { EvidenceCard, PolicyQuestion } from "./types";

const BOROUGHS = LONDON_BOROUGHS;

export type ChatHistoryMessage = { role: "user" | "assistant"; content: string };

export function classifyMessage(message: string): PolicyQuestion["category"] {
  const lower = message.toLowerCase();
  if (isMetaQuestion(message)) return "meta";
  if (/deadline|day 56|8-week|p152|timeliness|rush/.test(lower)) return "deadline";
  if (/small site|outer london|40%|design code|householder/.test(lower)) return "small-sites";
  if (/delay|approval rate|friction|slow/.test(lower)) return "friction";
  if (isDocumentCountQuestion(message)) return "friction";
  if (/pitch|2-minute|headline|policy ask|hackathon/.test(lower)) return "pitch";
  if (/phantom|stalled|not built|land bank|permission.*built/.test(lower)) return "phantom";
  if (/repeat|amendment|section 73|same site|same plot/.test(lower)) return "repeat";
  if (/depriv|imd|poverty|inequality/.test(lower)) return "friction";
  if (/census|population|household/.test(lower)) return "pitch";
  if (/housing gap|tightness|wheretobuild|demand/.test(lower)) return "pitch";
  return "meta";
}

export function extractBorough(message: string): string | undefined {
  const lower = message.toLowerCase();
  for (const b of BOROUGHS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return undefined;
}

/** Combine recent turns so follow-ups like "what about Lambeth?" still resolve context. */
export function buildConversationContext(
  message: string,
  history: ChatHistoryMessage[] = [],
): string {
  const recent = history
    .slice(-6)
    .map((m) => m.content)
    .join("\n");
  return `${recent}\n${message}`.trim();
}

export type McpContextBundle = {
  toolsUsed: { tool: string; arguments: Record<string, unknown>; result: Record<string, unknown> }[];
  evidenceCard: EvidenceCard;
  contextJson: string;
};

/** Gather MCP data for a user message — may call multiple tools for richer context. */
export async function gatherMcpContext(
  message: string,
  history: ChatHistoryMessage[] = [],
): Promise<McpContextBundle> {
  const contextText = buildConversationContext(message, history);
  const category = classifyMessage(contextText);
  const borough = extractBorough(contextText);

  const question: PolicyQuestion = {
    id: `chat-${Date.now()}`,
    asker: "Chat user",
    role: "Freeform",
    category,
    tag: "pitch-prep",
    tagLabel: "Chat",
    message,
    borough,
    isCustom: true,
  };

  const primary = toolPlanForQuestion(question);
  const toolsUsed: McpContextBundle["toolsUsed"] = [];

  const run = async (tool: string, args: Record<string, unknown>) => {
    const res = await callMcpTool(tool, args);
    if (res.ok && res.result) {
      toolsUsed.push({ tool, arguments: args, result: res.result });
    }
  };

  await run(primary.tool, primary.arguments);

  const lower = contextText.toLowerCase();

  if (category === "meta") {
    if (isDocumentCountQuestion(contextText)) {
      await run("get_planning_friction_by_borough", {
        borough_name: borough ?? "Lambeth",
      });
    }
  } else {
    if (
      (category === "repeat" || /repeat|amendment|same site|same plot/.test(lower)) &&
      primary.tool !== "get_repeat_application_burden"
    ) {
      await run("get_repeat_application_burden", borough ? { borough_name: borough } : {});
    }
    if (category === "deadline" || /deadline|day 56|8-week|p152/.test(lower)) {
      await run("get_deadline_bunching_by_borough", borough ? { borough_name: borough } : {});
    }
    if (category === "small-sites" || /small site|outer london|householder/.test(lower)) {
      await run("get_small_site_approval_gap", {});
    }
    if (
      (category === "friction" || /delay|approval rate|friction|document/.test(lower)) &&
      primary.tool !== "get_planning_friction_by_borough"
    ) {
      await run("get_planning_friction_by_borough", { borough_name: borough ?? "Lambeth" });
    }
  }

  if (borough && /census|population|household|demograph/.test(lower)) {
    await run("get_census_stats_by_borough", { borough_name: borough });
  }
  if (borough && /depriv|imd|poverty|inequality/.test(lower)) {
    await run("get_deprivation_by_borough", { borough_name: borough });
  }
  if (borough && /housing in london|stock change|affordability|tenure|completions/.test(lower)) {
    await run("get_housing_in_london_by_borough", { borough_name: borough });
  }
  if (borough && /housing gap|tightness|wheretobuild|demand|rightmove/.test(lower)) {
    await run("get_wheretobuild_by_borough", { borough_name: borough });
  }

  const primaryResult = toolsUsed.find((t) => t.tool === primary.tool)?.result ?? toolsUsed[0]?.result ?? {};
  const frictionResult = toolsUsed.find((t) => t.tool === "get_planning_friction_by_borough")?.result;
  const evidenceCard =
    category === "meta"
      ? buildMetaEvidenceCard(question, primaryResult, frictionResult)
      : buildEvidenceFromMcp(question, primary.tool, primaryResult);

  return {
    toolsUsed,
    evidenceCard,
    contextJson: JSON.stringify(toolsUsed, null, 2),
  };
}

export const HOUSING_ANALYST_PERSONA = `You are a sharp, conversational housing policy analyst at House London (Newspeak House data sprint).

Each user message comes with fresh LIVE MCP tool results — Foundations planning data plus optional Census, IMD, Housing in London, and WhereToBuild layers. The conversation history is included; treat this as an ongoing dialogue, not isolated Q&A.

How to respond:
- Read the full thread. Answer follow-ups directly ("Yes — and in Lambeth…", "Compared to what we just discussed…").
- Lead with the most relevant number from the MCP data, then explain what it means in plain English.
- Name the MCP tool when citing a stat (e.g. get_repeat_application_burden).
- Vary your structure — don't repeat the same template every turn.
- Offer a concrete policy ask when it fits naturally, not every single time.
- If the user asks about "accuracy", "the doc", data quality, or limitations, answer about data methodology — do NOT dump unrelated repeat-application stats. Clarify if they mean (a) n_documents per application in Foundations, (b) dataset caveats, or (c) this project's README.
- Only cite MCP tools that match the question. For meta/data-quality turns, explain caveats and what Foundations does not measure.
- You may ask one short clarifying question if the user is vague and borough/topic is unclear.
- Keep replies focused: usually 2–4 short paragraphs. Use bullets sparingly for comparisons.
- Never invent statistics. If MCP data is missing, say what's unavailable and suggest what to query next.
- For pitch prep, help the user refine their 2-minute story across multiple turns.`;
