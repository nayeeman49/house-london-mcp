import { buildEvidenceFromMcp, pct, toolPlanForQuestion } from "./evidence-engine";
import type {
  ConversationMessage,
  EvidenceCard,
  PolicyQuestion,
  PresetConversation,
} from "./types";

const MAX_ANALYST_TURNS = 4;

type FollowUpRound = {
  suggestions: string[];
  replies: Record<string, string> & { default: string };
  tool?: string;
  toolArgs?: Record<string, unknown>;
};

const FOLLOW_UPS: Record<string, FollowUpRound[]> = {
  repeat: [
    {
      suggestions: [
        "Break that down for Lambeth only.",
        "How does this compare to deadline bunching?",
        "Is 59% realistic or an overestimate?",
      ],
      replies: {
        "Break that down for Lambeth only.":
          "I'll re-run get_repeat_application_burden with borough_name=Lambeth — expect a lower share than all-London because dense areas cluster more.",
        "How does this compare to deadline bunching?":
          "Different mechanism: repeat apps = workload waste; deadline bunching = KPI-driven timing. Both hit officer capacity without adding homes.",
        "Is 59% realistic or an overestimate?":
          "Yes — 25m grid clustering is an upper bound. Treat as 'at least X%' in your pitch and mention the caveat.",
        default:
          "The repeat-application share is the strongest opening stat. Pair it with a borough-specific deadline example for the mechanism.",
      },
      tool: "get_repeat_application_burden",
      toolArgs: { borough_name: "Lambeth" },
    },
    {
      suggestions: [
        "Draft my pitch opening line.",
        "What's the policy ask?",
        "Show Bexley deadline numbers.",
      ],
      replies: {
        "Draft my pitch opening line.":
          "Try: '59% of London housing applications aren't new sites — they're repeat visits to plots we've already decided.'",
        "What's the policy ask?":
          "Count sites once in pipeline stats; create a fast-track amendment route instead of full re-applications.",
        "Show Bexley deadline numbers.":
          "Running get_deadline_bunching_by_borough for Bexley — expect ~32% on deadline with worse approval rates.",
        default:
          "Lead with the repeat stat, mechanism with Bexley deadlines, close with pipeline reporting reform.",
      },
      tool: "get_deadline_bunching_by_borough",
      toolArgs: { borough_name: "Bexley" },
    },
  ],
  deadline: [
    {
      suggestions: [
        "Compare Bexley to Camden.",
        "What's the all-London picture?",
        "Why does this happen?",
      ],
      replies: {
        "Compare Bexley to Camden.":
          "Bexley shows extreme deadline bunching (~32%); Camden is near the floor (~1–2%). Same KPI, opposite behaviour.",
        "What's the all-London picture?":
          "All London: ~20% on deadline, approval 72% vs 87% well before — replicated from House London #0 findings.",
        "Why does this happen?":
          "Councils are measured on P152/P154 '% within 8 weeks' — rewards deciding by the deadline regardless of readiness.",
        default:
          "Deadline bunching is a measurable KPI side-effect, not anecdote.",
      },
      tool: "get_deadline_bunching_by_borough",
      toolArgs: {},
    },
    {
      suggestions: [
        "What KPI would you replace P152 with?",
        "Draft the 2-minute pitch.",
      ],
      replies: {
        "What KPI would you replace P152 with?":
          "Appeal-survival rate or quality-adjusted timeliness — The Spike team's recommendation, validated on fresh Foundations data.",
        "Draft the 2-minute pitch.":
          "Open: '1 in 5 London decisions lands on day 56.' Mechanism: timeliness KPI. Ask: quality-adjusted metric + token commencement fix at 3 years.",
        default:
          "You have the mechanism and the borough example — export the pitch brief when ready.",
      },
    },
  ],
  "small-sites": [
    {
      suggestions: [
        "Is outer London refusing small apps?",
        "Where does the 40% target break?",
        "Compare to delivery data.",
      ],
      replies: {
        "Is outer London refusing small apps?":
          "No — outer submits 75% of small apps and approval rates are similar (74% vs 78%). Not a refusal story.",
        "Where does the 40% target break?":
          "At delivery, not submission. Small apps are ~15% of delivered units vs 38–40% policy target (House London #0).",
        "Compare to delivery data.":
          "Foundations tracks applications, not completions — pair with Planning London Datahub for delivery gap.",
        default:
          "Shift the policy conversation from 'outer London blocks small sites' to 'delivery and unit counts'.",
      },
    },
  ],
  friction: [
    {
      suggestions: [
        "Compare Greenwich and Lambeth.",
        "Which borough is slowest?",
      ],
      replies: {
        "Compare Greenwich and Lambeth.":
          "Run get_planning_friction_by_borough for each — Greenwich has lower raw approval in House London data; check mix not culture.",
        "Which borough is slowest?":
          "Varies by period — use avg_decision_delay_days from the tool, not reputation.",
        default:
          "Always control for application type before comparing borough refusal rates.",
      },
    },
  ],
  pitch: [
    {
      suggestions: [
        "Give me the repeat stat.",
        "Add Bexley as the example.",
        "Write the policy ask.",
      ],
      replies: {
        "Give me the repeat stat.":
          "59% repeat_application_share across geocoded London housing applications (Foundations 2022–25).",
        "Add Bexley as the example.":
          "Bexley: 32% decide on deadline; 68% approved on deadline vs 95% well before.",
        "Write the policy ask.":
          "Count sites once in pipeline reporting; replace 8-week timeliness KPI with quality-adjusted metric.",
        default:
          "Export the pitch brief from Step 3 when your evidence card looks right.",
      },
    },
  ],
};

function scriptKey(category: PolicyQuestion["category"]): string {
  if (category === "phantom") return "repeat";
  return category;
}

function liveReply(
  userText: string,
  card: EvidenceCard,
  fallback: string,
): string {
  const m = card.rawMetrics ?? {};
  const t = userText.trim();

  if (t === "Give me the repeat stat." && m.repeat_application_share != null) {
    return `${pct(m.repeat_application_share as number)} of geocoded London housing applications sit at repeat sites (${Number(m.repeat_applications ?? 0).toLocaleString()} of ${Number(m.total_applications ?? 0).toLocaleString()}, Foundations 2022–25).`;
  }
  if (t === "Is 59% realistic or an overestimate?" && m.repeat_application_share != null) {
    return `The live share is ${pct(m.repeat_application_share as number)} — 25m grid clustering is still an upper bound. Treat as "at least X%" and mention the caveat.`;
  }
  if (t === "Draft my pitch opening line." && m.repeat_application_share != null) {
    return `Try: "${pct(m.repeat_application_share as number)} of London housing applications aren't new sites — they're repeat visits to plots we've already decided."`;
  }
  if (t === "Show Bexley deadline numbers." && m.deadline_day_share != null) {
    const borough = (m.borough as string) ?? "Bexley";
    return `${borough}: ${pct(m.deadline_day_share as number)} on deadline; ${pct(m.approval_rate_on_deadline as number)} approved on deadline vs ${pct(m.approval_rate_well_before_deadline as number)} well before.`;
  }
  if (t === "What's the all-London picture?" && m.deadline_day_share != null && !m.borough) {
    return `All London: ${pct(m.deadline_day_share as number)} on deadline, approval ${pct(m.approval_rate_on_deadline as number)} vs ${pct(m.approval_rate_well_before_deadline as number)} well before.`;
  }
  if (t === "Compare Bexley to Camden." && m.deadline_day_share != null) {
    const borough = (m.borough as string) ?? "this borough";
    return `${borough}: ${pct(m.deadline_day_share as number)} on deadline — run again for the other borough to compare.`;
  }
  if (t === "Is outer London refusing small apps?" && m.outer_share_of_small_applications != null) {
    const inner = m.inner_london as { approval_rate?: number } | undefined;
    const outer = m.outer_london as { approval_rate?: number; applications?: number } | undefined;
    return `No — outer London submits ${pct(m.outer_share_of_small_applications as number)} of small apps (${outer?.applications?.toLocaleString() ?? "?"} apps) with approval ${pct(outer?.approval_rate)} vs inner ${pct(inner?.approval_rate)}.`;
  }
  if (t === "Add Bexley as the example." && m.deadline_day_share != null) {
    const borough = (m.borough as string) ?? "Bexley";
    return `${borough}: ${pct(m.deadline_day_share as number)} decide on deadline; ${pct(m.approval_rate_on_deadline as number)} approved on deadline vs ${pct(m.approval_rate_well_before_deadline as number)} well before.`;
  }

  return fallback;
}

export function getSuggestedFollowUps(
  question: PolicyQuestion,
  conversation: PresetConversation | null,
): string[] {
  if (!conversation || conversation.isComplete) return [];
  const scripts = FOLLOW_UPS[scriptKey(question.category)] ?? [];
  const round = Math.min(conversation.analystTurnCount, scripts.length - 1);
  return scripts[round]?.suggestions ?? [];
}

export async function startPresetWithMcp(
  question: PolicyQuestion,
  callTool: (
    tool: string,
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>,
): Promise<PresetConversation> {
  const plan = toolPlanForQuestion(question);
  const data = await callTool(plan.tool, plan.arguments);
  const card = buildEvidenceFromMcp(question, plan.tool, data);

  const messages: ConversationMessage[] = [
    {
      id: `${question.id}-user-0`,
      role: "user",
      text: question.message,
      sentAt: new Date().toISOString(),
    },
    {
      id: `${question.id}-analyst-0`,
      role: "analyst",
      text: card.replyText,
      sentAt: new Date().toISOString(),
      mcpTool: plan.tool,
    },
  ];

  return {
    questionId: question.id,
    messages,
    latestCard: card,
    analystTurnCount: 1,
    maxTurns: MAX_ANALYST_TURNS,
    isComplete: false,
  };
}

export async function continuePresetWithMcp(
  question: PolicyQuestion,
  conversation: PresetConversation,
  userText: string,
  callTool: (
    tool: string,
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>,
): Promise<PresetConversation> {
  const scripts = FOLLOW_UPS[scriptKey(question.category)] ?? [];
  const roundIdx = Math.min(conversation.analystTurnCount - 1, scripts.length - 1);
  const round = scripts[roundIdx];
  const staticReply =
    round?.replies[userText.trim()] ?? round?.replies.default ?? "Noted — see evidence card for the latest MCP output.";
  let replyText = staticReply;

  const messages: ConversationMessage[] = [
    ...conversation.messages,
    {
      id: `${question.id}-user-${conversation.analystTurnCount}`,
      role: "user",
      text: userText.trim(),
      sentAt: new Date().toISOString(),
    },
  ];

  let card = conversation.latestCard;

  if (round?.tool) {
    const data = await callTool(round.tool, round.toolArgs ?? {});
    card = buildEvidenceFromMcp(question, round.tool, data);
    replyText = liveReply(userText, card, staticReply);
    messages.push({
      id: `${question.id}-analyst-${conversation.analystTurnCount}`,
      role: "analyst",
      text: `${replyText}\n\nUpdated evidence: ${card.headline}`,
      sentAt: new Date().toISOString(),
      mcpTool: round.tool,
    });
  } else {
    replyText = liveReply(userText, card, staticReply);
    messages.push({
      id: `${question.id}-analyst-${conversation.analystTurnCount}`,
      role: "analyst",
      text: replyText,
      sentAt: new Date().toISOString(),
    });
  }

  const analystTurnCount = conversation.analystTurnCount + 1;
  const isComplete = analystTurnCount >= MAX_ANALYST_TURNS;

  return {
    ...conversation,
    messages,
    latestCard: card,
    analystTurnCount,
    isComplete,
  };
}

export function formatConversationTranscript(
  conversation: PresetConversation,
): string {
  return conversation.messages
    .map((m) => `${m.role === "user" ? "Asked" : "Analyst"}: ${m.text}`)
    .join("\n\n");
}
