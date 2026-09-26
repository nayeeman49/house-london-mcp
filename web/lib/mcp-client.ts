import { spawn } from "node:child_process";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type McpCallResult = {
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
  transport: "mcp-sdk" | "python-bridge";
};

function projectRoot(): string {
  return (
    process.env.HOUSING_PROJECT_ROOT ??
    path.resolve(process.cwd(), "..")
  );
}

function pythonPath(): string {
  return (
    process.env.MCP_PYTHON ??
    path.join(projectRoot(), "venv", "bin", "python")
  );
}

function serverPath(): string {
  return (
    process.env.MCP_SERVER ??
    path.join(projectRoot(), "src", "server.py")
  );
}

let mcpClient: Client | null = null;
let mcpConnecting: Promise<Client> | null = null;

async function getMcpSdkClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  if (mcpConnecting) return mcpConnecting;

  mcpConnecting = (async () => {
    const transport = new StdioClientTransport({
      command: pythonPath(),
      args: [serverPath()],
      cwd: projectRoot(),
    });
    const client = new Client(
      { name: "house-london-evidence-desk", version: "1.0.0" },
      { capabilities: {} },
    );
    await client.connect(transport);
    mcpClient = client;
    return client;
  })();

  return mcpConnecting;
}

function parseToolResult(content: unknown): Record<string, unknown> {
  if (!Array.isArray(content)) {
    throw new Error("Unexpected MCP tool response shape");
  }
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string"
    ) {
      try {
        return JSON.parse(block.text) as Record<string, unknown>;
      } catch {
        return { text: block.text };
      }
    }
  }
  return { content };
}

async function callViaPythonBridge(
  tool: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  const script = path.join(projectRoot(), "scripts", "run_mcp_tool.py");

  return new Promise((resolve) => {
    const proc = spawn(pythonPath(), [script], {
      cwd: projectRoot(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      try {
        const parsed = JSON.parse(stdout.trim() || "{}") as {
          ok?: boolean;
          result?: Record<string, unknown>;
          error?: string;
        };
        if (code !== 0 || parsed.ok === false) {
          resolve({
            ok: false,
            error: parsed.error ?? stderr ?? `Exit code ${code}`,
            transport: "python-bridge",
          });
          return;
        }
        resolve({
          ok: true,
          result: parsed.result ?? parsed,
          transport: "python-bridge",
        });
      } catch {
        resolve({
          ok: false,
          error: stderr || stdout || "Failed to parse bridge output",
          transport: "python-bridge",
        });
      }
    });

    proc.stdin.write(JSON.stringify({ tool, arguments: args }));
    proc.stdin.end();
  });
}

export async function callMcpTool(
  tool: string,
  args: Record<string, unknown> = {},
): Promise<McpCallResult> {
  try {
    const client = await getMcpSdkClient();
    const response = await client.callTool({ name: tool, arguments: args });

    if (response.isError) {
      throw new Error("MCP tool returned error flag");
    }

    const result = parseToolResult(response.content);
    return { ok: true, result, transport: "mcp-sdk" };
  } catch (sdkError) {
    const bridge = await callViaPythonBridge(tool, args);
    if (!bridge.ok) {
      return {
        ok: false,
        error: `${bridge.error} (SDK: ${sdkError instanceof Error ? sdkError.message : "failed"})`,
        transport: "python-bridge",
      };
    }
    return bridge;
  }
}

export async function listMcpTools(): Promise<
  { name: string; description: string }[]
> {
  try {
    const client = await getMcpSdkClient();
    const listed = await client.listTools();
    return listed.tools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
    }));
  } catch {
    return [
      { name: "list_data_sources", description: "Local dataset status" },
      { name: "get_repeat_application_burden", description: "Repeat site workload" },
      { name: "get_deadline_bunching_by_borough", description: "Deadline bunching" },
      { name: "get_small_site_approval_gap", description: "Small sites inner/outer" },
      { name: "get_planning_friction_by_borough", description: "Borough friction" },
      { name: "get_london_borough_map_metrics", description: "All-borough map metrics" },
      { name: "get_geocoded_applications", description: "Map point layer" },
      { name: "get_wheretobuild_by_borough", description: "WhereToBuild gap/tightness" },
      { name: "get_census_stats_by_borough", description: "Census 2021 stats" },
      { name: "get_deprivation_by_borough", description: "IMD deprivation" },
      { name: "get_housing_in_london_by_borough", description: "GLA Housing in London" },
      { name: "search_planning_constraints", description: "Constraints by postcode" },
      { name: "search_uk_planit_applications", description: "PlanIt search" },
    ];
  }
}
