#!/usr/bin/env python3
"""Print MCP tool names for smoke tests."""

TOOLS = [
    {"name": "list_data_sources", "description": "Which datasets are loaded locally"},
    {"name": "get_planning_friction_by_borough", "description": "Borough delay, docs, approval rate"},
    {"name": "get_deadline_bunching_by_borough", "description": "Statutory deadline bunching"},
    {"name": "get_small_site_approval_gap", "description": "Inner vs outer small apps"},
    {"name": "get_repeat_application_burden", "description": "Repeat site workload"},
    {"name": "get_london_borough_map_metrics", "description": "All-borough map metrics"},
    {"name": "get_geocoded_applications", "description": "Geocoded apps for map points"},
    {"name": "get_wheretobuild_by_borough", "description": "Warwick housing gap/tightness"},
    {"name": "get_wheretobuild_by_postcode", "description": "WhereToBuild via postcode"},
    {"name": "get_census_stats_by_borough", "description": "Nomis Census 2021 population/households"},
    {"name": "get_deprivation_by_borough", "description": "IMD 2025 borough summary"},
    {"name": "get_deprivation_by_postcode", "description": "IMD 2025 for postcode LSOA"},
    {"name": "get_housing_in_london_by_borough", "description": "GLA Housing in London indicators"},
    {"name": "search_planning_constraints", "description": "Constraints by postcode"},
    {"name": "search_uk_planit_applications", "description": "PlanIt search"},
]

if __name__ == "__main__":
    for tool in TOOLS:
        print(f"{tool['name']}: {tool['description']}")
