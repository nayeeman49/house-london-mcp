import { NextResponse } from "next/server";
import { guardApiRequest, guardMcpTool } from "@/lib/api-guard";
import { callMcpTool, listMcpTools } from "@/lib/mcp-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const blocked = guardApiRequest(request, "mcp-get", 120);
  if (blocked) return blocked;
  try {
    const tools = await listMcpTools();
    return NextResponse.json({
      ok: true,
      server: "Housing-Intent-Engine",
      tools,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list tools",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const blocked = guardApiRequest(request, "mcp-post", 90);
    if (blocked) return blocked;

    const body = (await request.json()) as {
      tool?: string;
      arguments?: Record<string, unknown>;
    };

    if (!body.tool) {
      return NextResponse.json({ ok: false, error: "Missing tool name" }, { status: 400 });
    }

    const toolBlocked = guardMcpTool(body.tool);
    if (toolBlocked) return toolBlocked;

    const result = await callMcpTool(body.tool, body.arguments ?? {});

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, transport: result.transport },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      tool: body.tool,
      result: result.result,
      transport: result.transport,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "MCP call failed",
      },
      { status: 500 },
    );
  }
}
