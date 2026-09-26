#!/usr/bin/env python3
"""CLI bridge: invoke Housing Intent Engine tools and return JSON on stdout."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.server import (  # noqa: E402
    get_census_stats_by_borough,
    get_deadline_bunching_by_borough,
    get_deprivation_by_borough,
    get_deprivation_by_postcode,
    get_geocoded_applications,
    get_housing_in_london_by_borough,
    get_london_borough_map_metrics,
    get_planning_friction_by_borough,
    get_repeat_application_burden,
    get_small_site_approval_gap,
    get_wheretobuild_by_borough,
    get_wheretobuild_by_postcode,
    list_data_sources,
    search_planning_constraints,
    search_uk_planit_applications,
)

TOOLS = {
    "get_planning_friction_by_borough": get_planning_friction_by_borough,
    "get_deadline_bunching_by_borough": get_deadline_bunching_by_borough,
    "get_small_site_approval_gap": get_small_site_approval_gap,
    "get_repeat_application_burden": get_repeat_application_burden,
    "get_london_borough_map_metrics": get_london_borough_map_metrics,
    "get_geocoded_applications": get_geocoded_applications,
    "list_data_sources": list_data_sources,
    "get_wheretobuild_by_borough": get_wheretobuild_by_borough,
    "get_wheretobuild_by_postcode": get_wheretobuild_by_postcode,
    "get_census_stats_by_borough": get_census_stats_by_borough,
    "get_deprivation_by_borough": get_deprivation_by_borough,
    "get_deprivation_by_postcode": get_deprivation_by_postcode,
    "get_housing_in_london_by_borough": get_housing_in_london_by_borough,
    "search_planning_constraints": search_planning_constraints,
    "search_uk_planit_applications": search_uk_planit_applications,
}


def main() -> None:
    payload = json.load(sys.stdin)
    tool = payload["tool"]
    arguments = payload.get("arguments") or {}

    if tool not in TOOLS:
        print(json.dumps({"error": f"Unknown tool: {tool}"}))
        sys.exit(1)

    try:
        result = TOOLS[tool](**arguments)
        print(json.dumps({"ok": True, "result": result}))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
