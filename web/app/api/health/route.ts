import { NextResponse } from "next/server";
import { callMcpTool } from "@/lib/mcp-client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await callMcpTool("list_data_sources", {});

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "degraded",
          mcp: false,
          error: result.error,
        },
        { status: 503 },
      );
    }

    const data = (result.result ?? {}) as Record<string, boolean>;
    const foundations = Boolean(data.foundations);
    const layers = ["foundations", "wheretobuild", "imd2025", "census2021_ltla", "housing_in_london"];

    return NextResponse.json({
      ok: true,
      status: foundations ? "healthy" : "degraded",
      mcp: true,
      transport: result.transport,
      foundations,
      sources: layers.map((name) => ({ name, available: Boolean(data[name]) })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        mcp: false,
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 503 },
    );
  }
}
