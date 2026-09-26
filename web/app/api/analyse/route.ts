import { NextResponse } from "next/server";
import { guardApiRequest, guardMcpTool } from "@/lib/api-guard";
import { buildEvidenceFromMcp, toolPlanForQuestion } from "@/lib/evidence-engine";
import { callMcpTool } from "@/lib/mcp-client";
import { classifyMessage, extractBorough } from "@/lib/mcp-context";
import type { PolicyQuestion } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const blocked = guardApiRequest(request, "analyse", 45);
    if (blocked) return blocked;

    const body = (await request.json()) as {
      message?: string;
      asker?: string;
      borough?: string;
    };

    if (!body.message?.trim()) {
      return NextResponse.json({ ok: false, error: "Message required" }, { status: 400 });
    }

    const category = classifyMessage(body.message);
    const question: PolicyQuestion = {
      id: `custom-${Date.now()}`,
      asker: body.asker ?? "Custom query",
      role: "Freeform",
      category,
      tag: "pitch-prep",
      tagLabel: "Individual",
      message: body.message.trim(),
      borough: body.borough ?? extractBorough(body.message),
      isCustom: true,
    };

    const plan = toolPlanForQuestion(question);
    const toolBlocked = guardMcpTool(plan.tool);
    if (toolBlocked) return toolBlocked;

    const mcp = await callMcpTool(plan.tool, plan.arguments);

    if (!mcp.ok || !mcp.result) {
      return NextResponse.json(
        { ok: false, error: mcp.error ?? "MCP call failed" },
        { status: 502 },
      );
    }

    const card = buildEvidenceFromMcp(question, plan.tool, mcp.result);

    return NextResponse.json({
      ok: true,
      card,
      transport: mcp.transport,
      tool: plan.tool,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
