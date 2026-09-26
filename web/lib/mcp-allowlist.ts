/** Tools exposed to the Next.js API (mirrors scripts/run_mcp_tool.py). */
export const MCP_TOOL_ALLOWLIST = new Set([
  "list_data_sources",
  "get_planning_friction_by_borough",
  "get_deadline_bunching_by_borough",
  "get_small_site_approval_gap",
  "get_repeat_application_burden",
  "search_planning_constraints",
  "search_uk_planit_applications",
  "get_london_borough_map_metrics",
  "get_geocoded_applications",
  "get_deprivation_by_postcode",
  "get_deprivation_by_borough",
  "get_census_stats_by_borough",
  "get_housing_in_london_by_borough",
  "get_wheretobuild_by_borough",
  "get_wheretobuild_by_postcode",
]);

export function assertAllowedTool(tool: string): void {
  if (!MCP_TOOL_ALLOWLIST.has(tool)) {
    throw new Error(`Tool not allowed: ${tool}`);
  }
}
