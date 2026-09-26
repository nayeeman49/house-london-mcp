import { NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/api-guard";
import {
  gatherMcpContext,
  HOUSING_ANALYST_PERSONA,
  type ChatHistoryMessage,
} from "@/lib/mcp-context";
import {
  buildLocalChatReply,
  openAiErrorNotice,
  shouldSkipOpenAi,
} from "@/lib/local-chat-reply";

export const runtime = "nodejs";

type ChatMessage = ChatHistoryMessage;

function mcpOnlyResponse(
  mcp: Awaited<ReturnType<typeof gatherMcpContext>>,
  userMessage: string,
  notice?: string,
) {
  return NextResponse.json({
    ok: true,
    mode: "mcp-only" as const,
    reply: buildLocalChatReply(userMessage, mcp),
    evidenceCard: mcp.evidenceCard,
    toolsUsed: mcp.toolsUsed.map((t) => t.tool),
    notice,
  });
}

export async function POST(request: Request) {
  try {
    const blocked = guardApiRequest(request, "chat", 30);
    if (blocked) return blocked;

    const body = (await request.json()) as { messages?: ChatMessage[] };

    if (!body.messages?.length) {
      return NextResponse.json({ ok: false, error: "messages required" }, { status: 400 });
    }

    const history = body.messages.filter((m) => m.content?.trim());
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser?.content.trim()) {
      return NextResponse.json({ ok: false, error: "No user message" }, { status: 400 });
    }

    const userMessage = lastUser.content.trim();
    const lastUserIdx = history.lastIndexOf(lastUser);
    const priorHistory = history.slice(0, lastUserIdx);
    const mcp = await gatherMcpContext(userMessage, priorHistory);

    if (shouldSkipOpenAi()) {
      return mcpOnlyResponse(
        mcp,
        userMessage,
        process.env.USE_MCP_ONLY === "true"
          ? "USE_MCP_ONLY=true — live MCP answers only (no OpenAI charges)."
          : "No OPENAI_API_KEY — live MCP answers only.",
      );
    }

    const apiKey = process.env.OPENAI_API_KEY!;

    const systemPrompt = `${HOUSING_ANALYST_PERSONA}

--- LIVE MCP TOOL RESULTS (fetched for this message) ---
${mcp.contextJson}

Primary evidence card:
- Headline: ${mcp.evidenceCard.headline}
- Policy ask: ${mcp.evidenceCard.policyAsk}
- Caveat: ${mcp.evidenceCard.caveat ?? "None"}
- Tools called: ${mcp.toolsUsed.map((t) => t.tool).join(", ")}`;

    const openaiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-12).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 800,
        messages: openaiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return mcpOnlyResponse(
        mcp,
        userMessage,
        openAiErrorNotice(response.status, errText),
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content as string | undefined;

    if (!reply?.trim()) {
      return mcpOnlyResponse(mcp, userMessage, "Empty AI response — using MCP data.");
    }

    return NextResponse.json({
      ok: true,
      mode: "ai" as const,
      reply: reply.trim(),
      evidenceCard: mcp.evidenceCard,
      toolsUsed: mcp.toolsUsed.map((t) => t.tool),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Chat failed",
      },
      { status: 500 },
    );
  }
}
