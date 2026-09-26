import { NextResponse } from "next/server";
import { assertAllowedTool } from "./mcp-allowlist";
import { clientRateLimitKey, rateLimit } from "./rate-limit";

export function guardApiRequest(
  request: Request,
  prefix: string,
  limit = 60,
): NextResponse | null {
  const key = clientRateLimitKey(request, prefix);
  const check = rateLimit(key, limit);
  if (!check.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded", retryAfterSec: check.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(check.retryAfterSec) } },
    );
  }
  return null;
}

export function guardMcpTool(tool: string): NextResponse | null {
  try {
    assertAllowedTool(tool);
    return null;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Tool not allowed" },
      { status: 403 },
    );
  }
}
