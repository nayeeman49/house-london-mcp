"""Local MCP server for House London hackathon analytics."""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import duckdb
import requests
from mcp.server.fastmcp import FastMCP

from src.datasets import (
    BOROUGH_GSS,
    LOCAL_CENSUS,
    LOCAL_HOUSING,
    LOCAL_IMD,
    LOCAL_WTB,
    alias_borough,
    dataset_status,
    enrich_borough_map_records,
    ensure_census,
    ensure_housing_london,
    ensure_imd,
    fetch_nomis_borough,
    geocode_postcode,
    resolve_borough,
)

mcp = FastMCP("Housing-Intent-Engine")

FOUNDATIONS_PARQUET_URL = "https://foreman.house-london.uk/download/parquet/"
LOCAL_PARQUET = os.path.join(os.path.dirname(__file__), "..", "data", "foundations.parquet")

LONDON_BOROUGHS = {
    "Barking and Dagenham",
    "Barnet",
    "Bexley",
    "Brent",
    "Bromley",
    "Camden",
    "City",
    "Croydon",
    "Ealing",
    "Enfield",
    "Greenwich",
    "Hackney",
    "Hammersmith and Fulham",
    "Haringey",
    "Harrow",
    "Havering",
    "Hillingdon",
    "Hounslow",
    "Islington",
    "Kensington",
    "Kingston",
    "Lambeth",
    "Lewisham",
    "London Legacy",
    "Merton",
    "Newham",
    "Old Oak Park Royal",
    "Redbridge",
    "Richmond",
    "Southwark",
    "Sutton",
    "Tower Hamlets",
    "Waltham Forest",
    "Wandsworth",
    "Westminster",
}

CONSTRAINT_DATASETS = (
    "conservation-area",
    "green-belt",
    "brownfield-land",
    "article-4-direction-area",
    "flood-risk-zone",
)


def _foundations_source() -> str:
    if os.path.exists(LOCAL_PARQUET):
        return LOCAL_PARQUET
    return FOUNDATIONS_PARQUET_URL


def _normalize_borough(name: str) -> str:
    cleaned = name.strip()
    for borough in LONDON_BOROUGHS:
        if borough.lower() == cleaned.lower():
            return borough
    raise ValueError(
        f"Unknown borough '{name}'. Use an exact London borough name, e.g. 'Lambeth'."
    )


_FOUNDATIONS_CON: duckdb.DuckDBPyConnection | None = None
_FOUNDATIONS_SOURCE: str | None = None


def _foundations_con() -> duckdb.DuckDBPyConnection:
    global _FOUNDATIONS_CON, _FOUNDATIONS_SOURCE
    source = _foundations_source()
    if _FOUNDATIONS_CON is None or _FOUNDATIONS_SOURCE != source:
        _FOUNDATIONS_CON = duckdb.connect()
        _FOUNDATIONS_CON.execute(
            """
            CREATE OR REPLACE TEMP TABLE foundations AS
            SELECT * FROM read_parquet(?)
            """,
            [source],
        )
        _FOUNDATIONS_SOURCE = source
    return _FOUNDATIONS_CON


def _read_foundations(con: duckdb.DuckDBPyConnection) -> str:
    _ = con
    return _foundations_source()


@mcp.tool()
def get_planning_friction_by_borough(borough_name: str) -> dict[str, Any]:
    """Return decision delays, document counts, and approval rates for one borough."""
    borough = _normalize_borough(borough_name)
    con = _foundations_con()
    source = _read_foundations(con)

    row = con.execute(
        """
        SELECT
            COUNT(*) AS total_apps,
            AVG(days_to_decision) AS avg_delay,
            AVG(n_documents) AS avg_docs,
            AVG(n_comments) AS avg_comments,
            AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END) AS approval_rate
        FROM foundations
        WHERE area_name = ?
          AND days_to_decision IS NOT NULL
        """,
        [borough],
    ).fetchone()

    return {
        "borough": borough,
        "total_applications": int(row[0] or 0),
        "avg_decision_delay_days": round(row[1], 1) if row[1] is not None else None,
        "avg_document_count": round(row[2], 1) if row[2] is not None else None,
        "avg_comment_count": round(row[3], 1) if row[3] is not None else None,
        "approval_rate": round(row[4], 3) if row[4] is not None else None,
        "data_source": "local" if source == LOCAL_PARQUET else "remote",
    }


@mcp.tool()
def get_deadline_bunching_by_borough(
    borough_name: str | None = None,
) -> dict[str, Any]:
    """Measure statutory-deadline bunching: share of decisions on the last day of the clock."""
    con = _foundations_con()
    _read_foundations(con)

    params: list[Any] = []
    borough_filter = ""
    if borough_name:
        borough = _normalize_borough(borough_name)
        borough_filter = "AND area_name = ?"
        params.append(borough)

    rows = con.execute(
        f"""
        WITH decided AS (
            SELECT
                area_name,
                app_size,
                status,
                days_to_decision,
                COALESCE(n_statutory_days, CASE app_size
                    WHEN 'Small' THEN 56
                    WHEN 'Medium' THEN 91
                    WHEN 'Large' THEN 91
                    ELSE 56
                END) AS statutory_days
            FROM foundations
            WHERE days_to_decision IS NOT NULL
              AND status IN ('Permitted', 'Rejected')
              {borough_filter}
        ),
        tagged AS (
            SELECT
                *,
                days_to_decision BETWEEN statutory_days - 1 AND statutory_days + 1 AS on_deadline,
                days_to_decision <= statutory_days - 14 AS well_before_deadline
            FROM decided
        )
        SELECT
            COUNT(*) AS total_decided,
            AVG(CASE WHEN on_deadline THEN 1.0 ELSE 0.0 END) AS deadline_share,
            AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END)
                FILTER (WHERE on_deadline) AS approval_rate_on_deadline,
            AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END)
                FILTER (WHERE well_before_deadline) AS approval_rate_before_deadline,
            AVG(days_to_decision) FILTER (WHERE on_deadline) AS avg_days_on_deadline
        FROM tagged
        """,
        params,
    ).fetchone()

    return {
        "borough": borough_name.strip() if borough_name else "all_london",
        "total_decided": int(rows[0] or 0),
        "deadline_day_share": round(rows[1], 3) if rows[1] is not None else None,
        "approval_rate_on_deadline": round(rows[2], 3) if rows[2] is not None else None,
        "approval_rate_well_before_deadline": round(rows[3], 3) if rows[3] is not None else None,
        "avg_days_on_deadline_cohort": round(rows[4], 1) if rows[4] is not None else None,
    }


@mcp.tool()
def get_small_site_approval_gap() -> dict[str, Any]:
    """Compare small-site (app_size='Small') submission and approval rates: inner vs outer London."""
    con = _foundations_con()
    _read_foundations(con)

    rows = con.execute(
        """
        WITH small_sites AS (
            SELECT
                area_name,
                CASE
                    WHEN area_name IN (
                        'Camden', 'City', 'Greenwich', 'Hackney',
                        'Hammersmith and Fulham', 'Islington', 'Kensington',
                        'Lambeth', 'Lewisham', 'Newham', 'Southwark',
                        'Tower Hamlets', 'Wandsworth', 'Westminster'
                    ) THEN 'inner'
                    ELSE 'outer'
                END AS ring,
                status
            FROM foundations
            WHERE app_size = 'Small'
        )
        SELECT
            ring,
            COUNT(*) AS applications,
            AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END) AS approval_rate
        FROM small_sites
        WHERE status IN ('Permitted', 'Rejected')
        GROUP BY ring
        ORDER BY ring
        """
    ).fetchall()

    by_ring = {
        ring: {
            "applications": int(count),
            "approval_rate": round(rate, 3) if rate is not None else None,
        }
        for ring, count, rate in rows
    }

    inner = by_ring.get("inner", {"applications": 0, "approval_rate": None})
    outer = by_ring.get("outer", {"applications": 0, "approval_rate": None})
    total_small = inner["applications"] + outer["applications"]
    outer_share = round(outer["applications"] / total_small, 3) if total_small else None

    return {
        "inner_london": inner,
        "outer_london": outer,
        "outer_share_of_small_applications": outer_share,
        "filter_used": "app_size = 'Small' (householder/minor applications)",
    }


@mcp.tool()
def get_repeat_application_burden(
    grid_meters: int = 25,
    borough_name: str | None = None,
) -> dict[str, Any]:
    """Estimate how much planning workload comes from repeat bites at the same site."""
    if grid_meters < 10 or grid_meters > 100:
        raise ValueError("grid_meters must be between 10 and 100")

    con = _foundations_con()
    _read_foundations(con)

    grid_deg = grid_meters / 111_000
    params: list[Any] = [grid_deg]
    borough_filter = ""
    if borough_name:
        borough = _normalize_borough(borough_name)
        borough_filter = "AND area_name = ?"
        params.append(borough)

    row = con.execute(
        f"""
        WITH geocoded AS (
            SELECT
                area_name,
                n_dwellings,
                days_to_decision,
                ROUND(lat / ?, 4) AS lat_bucket,
                ROUND(lng / ?, 4) AS lng_bucket
            FROM foundations
            WHERE lat IS NOT NULL
              AND lng IS NOT NULL
              {borough_filter}
        ),
        sites AS (
            SELECT
                lat_bucket,
                lng_bucket,
                COUNT(*) AS app_count,
                SUM(COALESCE(n_dwellings, 0)) AS total_dwellings,
                SUM(COALESCE(days_to_decision, 0)) AS total_decision_days
            FROM geocoded
            GROUP BY lat_bucket, lng_bucket
        )
        SELECT
            COUNT(*) AS total_sites,
            SUM(app_count) AS total_applications,
            SUM(CASE WHEN app_count >= 2 THEN 1 ELSE 0 END) AS repeat_sites,
            SUM(CASE WHEN app_count >= 2 THEN app_count ELSE 0 END) AS repeat_applications,
            SUM(CASE WHEN app_count >= 2 THEN total_decision_days ELSE 0 END) AS repeat_decision_days,
            SUM(total_dwellings) AS all_dwellings,
            SUM(CASE WHEN app_count >= 2 THEN LEAST(total_dwellings, 500) ELSE 0 END)
                AS repeat_site_dwellings
        FROM sites
        """,
        [grid_deg, grid_deg, *params[1:]],
    ).fetchone()

    total_apps = int(row[1] or 0)
    repeat_apps = int(row[3] or 0)

    return {
        "borough": borough_name.strip() if borough_name else "all_london",
        "grid_meters_approx": grid_meters,
        "total_sites": int(row[0] or 0),
        "total_applications": total_apps,
        "repeat_sites": int(row[2] or 0),
        "repeat_applications": repeat_apps,
        "repeat_application_share": round(repeat_apps / total_apps, 3) if total_apps else None,
        "repeat_decision_days": int(row[4] or 0),
    }


@mcp.tool()
def search_planning_constraints(postcode: str) -> dict[str, Any]:
    """Look up conservation areas, green belt, brownfield, and similar constraints near a postcode."""
    normalized = postcode.replace(" ", "").upper()
    geo = requests.get(
        f"https://api.postcodes.io/postcodes/{normalized}",
        timeout=10,
    )
    geo.raise_for_status()
    location = geo.json()["result"]
    lat = location["latitude"]
    lng = location["longitude"]

    def _fetch_dataset(dataset: str) -> list[dict[str, str | None]]:
        response = requests.get(
            "https://www.planning.data.gov.uk/entity.json",
            params={
                "latitude": lat,
                "longitude": lng,
                "dataset": dataset,
                "limit": 3,
            },
            timeout=10,
        )
        response.raise_for_status()
        return [
            {
                "name": entity.get("name"),
                "dataset": entity.get("dataset"),
                "entry_date": entity.get("entry-date"),
            }
            for entity in response.json().get("entities", [])
        ]

    constraints: list[dict[str, str | None]] = []
    with ThreadPoolExecutor(max_workers=len(CONSTRAINT_DATASETS)) as pool:
        futures = {pool.submit(_fetch_dataset, ds): ds for ds in CONSTRAINT_DATASETS}
        for future in as_completed(futures):
            constraints.extend(future.result())

    return {
        "postcode": location["postcode"],
        "latitude": lat,
        "longitude": lng,
        "borough_hint": location.get("admin_district"),
        "constraints_found": constraints[:10],
    }


@mcp.tool()
def search_uk_planit_applications(
    postcode: str, radius_meters: int = 500
) -> list[dict[str, Any]]:
    """Search UK PlanIt for live planning applications within a radius of a postcode."""
    if radius_meters <= 0 or radius_meters > 100_000:
        raise ValueError("radius_meters must be between 1 and 100000")

    response = requests.get(
        "https://www.planit.org.uk/api/applics/json",
        params={
            "pcode": postcode.strip().upper(),
            "krad": radius_meters / 1000,
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    if "error" in data:
        return [{"error": data["error"]}]

    results: list[dict[str, Any]] = []
    for app in data.get("records", [])[:5]:
        results.append(
            {
                "app_size": app.get("app_size"),
                "description": app.get("description"),
                "address": app.get("address"),
                "status": app.get("app_state"),
                "area_name": app.get("area_name"),
                "link": app.get("url"),
            }
        )
    return results


@mcp.tool()
def get_london_borough_map_metrics(grid_meters: int = 25) -> dict[str, Any]:
    """Return planning metrics for every London borough — for map choropleth / bubble layers."""
    if grid_meters < 10 or grid_meters > 100:
        raise ValueError("grid_meters must be between 10 and 100")

    con = _foundations_con()
    _read_foundations(con)
    grid_deg = grid_meters / 111_000

    rows = con.execute(
        """
        WITH base AS (
            SELECT
                area_name,
                lat,
                lng,
                status,
                app_size,
                days_to_decision,
                n_documents,
                COALESCE(n_statutory_days, CASE app_size
                    WHEN 'Small' THEN 56
                    WHEN 'Medium' THEN 91
                    WHEN 'Large' THEN 91
                    ELSE 56
                END) AS statutory_days,
                ROUND(lat / ?, 4) AS lat_bucket,
                ROUND(lng / ?, 4) AS lng_bucket
            FROM foundations
            WHERE area_name IS NOT NULL
        ),
        friction AS (
            SELECT
                area_name,
                COUNT(*) AS total_apps,
                AVG(days_to_decision) FILTER (WHERE days_to_decision IS NOT NULL) AS avg_delay,
                AVG(n_documents) AS avg_docs,
                AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END)
                    FILTER (WHERE status IN ('Permitted', 'Rejected')) AS approval_rate
            FROM base
            GROUP BY area_name
        ),
        deadline AS (
            SELECT
                area_name,
                AVG(CASE
                    WHEN days_to_decision BETWEEN statutory_days - 1 AND statutory_days + 1
                    THEN 1.0 ELSE 0.0
                END) AS deadline_share,
                AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END)
                    FILTER (WHERE days_to_decision BETWEEN statutory_days - 1 AND statutory_days + 1)
                    AS approval_on_deadline,
                AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END)
                    FILTER (WHERE days_to_decision <= statutory_days - 14)
                    AS approval_before_deadline
            FROM base
            WHERE days_to_decision IS NOT NULL
              AND status IN ('Permitted', 'Rejected')
            GROUP BY area_name
        ),
        site_grid AS (
            SELECT area_name, lat_bucket, lng_bucket, COUNT(*) AS app_count
            FROM base
            WHERE lat IS NOT NULL AND lng IS NOT NULL
            GROUP BY area_name, lat_bucket, lng_bucket
        ),
        repeat_stats AS (
            SELECT
                area_name,
                SUM(app_count) AS geocoded_apps,
                SUM(CASE WHEN app_count >= 2 THEN app_count ELSE 0 END) AS repeat_apps
            FROM site_grid
            GROUP BY area_name
        ),
        small_stats AS (
            SELECT
                area_name,
                COUNT(*) FILTER (
                    WHERE app_size = 'Small' AND status IN ('Permitted', 'Rejected')
                ) AS small_apps,
                AVG(CASE WHEN status = 'Permitted' THEN 1.0 ELSE 0.0 END) FILTER (
                    WHERE app_size = 'Small' AND status IN ('Permitted', 'Rejected')
                ) AS small_approval_rate
            FROM base
            GROUP BY area_name
        )
        SELECT
            f.area_name,
            f.total_apps,
            f.avg_delay,
            f.avg_docs,
            f.approval_rate,
            d.deadline_share,
            d.approval_on_deadline,
            d.approval_before_deadline,
            r.geocoded_apps,
            r.repeat_apps,
            CASE
                WHEN r.geocoded_apps > 0 THEN r.repeat_apps::DOUBLE / r.geocoded_apps
                ELSE NULL
            END AS repeat_share,
            s.small_apps,
            s.small_approval_rate
        FROM friction f
        LEFT JOIN deadline d ON f.area_name = d.area_name
        LEFT JOIN repeat_stats r ON f.area_name = r.area_name
        LEFT JOIN small_stats s ON f.area_name = s.area_name
        ORDER BY f.area_name
        """,
        [grid_deg, grid_deg],
    ).fetchall()

    boroughs: list[dict[str, Any]] = []
    for row in rows:
        boroughs.append(
            {
                "borough": row[0],
                "total_applications": int(row[1] or 0),
                "avg_decision_delay_days": round(row[2], 1) if row[2] is not None else None,
                "avg_document_count": round(row[3], 1) if row[3] is not None else None,
                "approval_rate": round(row[4], 3) if row[4] is not None else None,
                "deadline_day_share": round(row[5], 3) if row[5] is not None else None,
                "approval_rate_on_deadline": round(row[6], 3) if row[6] is not None else None,
                "approval_rate_before_deadline": round(row[7], 3) if row[7] is not None else None,
                "geocoded_applications": int(row[8] or 0),
                "repeat_applications": int(row[9] or 0),
                "repeat_application_share": round(row[10], 3) if row[10] is not None else None,
                "small_applications": int(row[11] or 0),
                "small_site_approval_rate": round(row[12], 3) if row[12] is not None else None,
            }
        )

    boroughs, layers = enrich_borough_map_records(boroughs)

    return {
        "grid_meters_approx": grid_meters,
        "borough_count": len(boroughs),
        "boroughs": boroughs,
        "data_layers": layers,
    }


@mcp.tool()
def get_geocoded_applications(
    borough_name: str | None = None,
    app_size: str | None = None,
    status: str | None = None,
    limit: int = 400,
) -> dict[str, Any]:
    """Return geocoded planning applications for map point layers (filtered, capped)."""
    if limit < 1 or limit > 2000:
        raise ValueError("limit must be between 1 and 2000")

    valid_sizes = {"Small", "Medium", "Large"}
    if app_size and app_size not in valid_sizes:
        raise ValueError(f"app_size must be one of {sorted(valid_sizes)}")

    con = _foundations_con()
    _read_foundations(con)

    filters = ["lat IS NOT NULL", "lng IS NOT NULL"]
    params: list[Any] = []

    if borough_name:
        borough = _normalize_borough(borough_name)
        filters.append("area_name = ?")
        params.append(borough)
    if app_size:
        filters.append("app_size = ?")
        params.append(app_size)
    if status:
        filters.append("status = ?")
        params.append(status)

    where = " AND ".join(filters)
    params.append(limit)

    rows = con.execute(
        f"""
        SELECT
            lat,
            lng,
            area_name,
            app_size,
            status,
            days_to_decision,
            n_dwellings,
            description,
            reference
        FROM foundations
        WHERE {where}
        ORDER BY reference
        LIMIT ?
        """,
        params,
    ).fetchall()

    applications: list[dict[str, Any]] = []
    for row in rows:
        applications.append(
            {
                "lat": round(row[0], 6),
                "lng": round(row[1], 6),
                "borough": row[2],
                "app_size": row[3],
                "status": row[4],
                "days_to_decision": int(row[5]) if row[5] is not None else None,
                "n_dwellings": int(row[6]) if row[6] is not None else None,
                "description": (row[7] or "")[:120],
                "reference": row[8],
            }
        )

    return {
        "borough": borough_name.strip() if borough_name else "all_london",
        "filters": {
            "app_size": app_size,
            "status": status,
            "limit": limit,
        },
        "count": len(applications),
        "applications": applications,
    }


@mcp.tool()
def list_data_sources() -> dict[str, Any]:
    """Show which optional datasets are available locally and their download status."""
    status = dataset_status()
    return {
        **status,
        "notes": {
            "foundations": "Required — curl foreman.house-london.uk/download/parquet/",
            "wheretobuild": "Event-only — place data/wheretobuild.parquet from hackathon organisers",
            "imd2025": "Run: python scripts/download_datasets.py",
            "census2021_ltla": "Auto via download script; live Nomis API also used",
            "housing_in_london": "Auto via download script from data.london.gov.uk",
        },
    }


@mcp.tool()
def get_wheretobuild_by_borough(borough_name: str) -> dict[str, Any]:
    """Housing gap and tightness from Warwick WhereToBuild (local parquet, hackathon data)."""
    borough = resolve_borough(borough_name)
    if not os.path.exists(LOCAL_WTB):
        return {
            "borough": borough,
            "available": False,
            "error": "data/wheretobuild.parquet not found",
            "instructions": (
                "WhereToBuild is not publicly downloadable. "
                "Obtain the parquet from House London hackathon organisers and save to data/wheretobuild.parquet"
            ),
            "source": "https://wheretobuild.warwick.ac.uk/",
        }

    con = duckdb.connect()
    cols = {
        row[0].lower()
        for row in con.execute(
            f"DESCRIBE SELECT * FROM read_parquet('{LOCAL_WTB}')"
        ).fetchall()
    }

    borough_col = next(
        (c for c in ("area_name", "borough", "lad_name", "local_authority") if c in cols),
        None,
    )
    gap_col = next((c for c in ("housing_gap", "gap", "demand_gap") if c in cols), None)
    tight_col = next(
        (c for c in ("housing_tightness", "tightness", "demand_supply_ratio") if c in cols),
        None,
    )

    if not borough_col:
        return {
            "borough": borough,
            "available": True,
            "error": "Could not detect borough column in wheretobuild.parquet",
            "columns_found": sorted(cols),
        }

    search = alias_borough(borough)
    row = con.execute(
        f"""
        SELECT *
        FROM read_parquet(?)
        WHERE lower({borough_col}) IN (lower(?), lower(?))
        LIMIT 1
        """,
        [LOCAL_WTB, borough, search],
    ).fetchone()

    if not row and gap_col:
        tight_expr = f"AVG({tight_col})" if tight_col else "NULL"
        agg = con.execute(
            f"""
            SELECT COUNT(*) AS areas, AVG({gap_col}) AS avg_housing_gap, {tight_expr} AS avg_housing_tightness
            FROM read_parquet(?)
            WHERE lower({borough_col}) LIKE '%' || lower(?) || '%'
            """,
            [LOCAL_WTB, borough.split()[0]],
        ).fetchone()
        return {
            "borough": borough,
            "available": True,
            "match": "partial_aggregate",
            "areas_matched": int(agg[0] or 0),
            "avg_housing_gap": round(agg[1], 4) if agg[1] is not None else None,
            "avg_housing_tightness": round(agg[2], 4) if agg[2] is not None else None,
            "source": "wheretobuild.parquet",
        }

    if not row:
        return {
            "borough": borough,
            "available": True,
            "error": "No matching rows in wheretobuild.parquet",
            "borough_column": borough_col,
        }

    names = [d[0] for d in con.description]
    record = dict(zip(names, row))
    return {
        "borough": borough,
        "available": True,
        "source": "https://wheretobuild.warwick.ac.uk/",
        "data": record,
    }


@mcp.tool()
def get_wheretobuild_by_postcode(postcode: str) -> dict[str, Any]:
    """WhereToBuild metrics near a postcode (requires local wheretobuild.parquet)."""
    location = geocode_postcode(postcode)
    borough_result = get_wheretobuild_by_borough(location["borough"] or "")
    return {**borough_result, "postcode_lookup": location}


@mcp.tool()
def get_census_stats_by_borough(borough_name: str) -> dict[str, Any]:
    """Census 2021 population and household counts for a London borough (Nomis)."""
    borough = resolve_borough(borough_name)
    gss = BOROUGH_GSS.get(borough)
    if not gss:
        raise ValueError(f"No GSS code for borough '{borough}'")

    cached = None
    if os.path.exists(LOCAL_CENSUS):
        try:
            row = duckdb.connect().execute(
                "SELECT population, households FROM read_parquet(?) WHERE gss_code = ?",
                [LOCAL_CENSUS, gss],
            ).fetchone()
            if row:
                cached = {"population": row[0], "households": row[1], "source": "local_parquet"}
        except Exception:  # noqa: BLE001
            cached = None

    live = None if cached else fetch_nomis_borough(gss)

    return {
        "borough": borough,
        "gss_code": gss,
        "live_nomis": live,
        "cached": cached,
        "preferred_source": "local_parquet" if cached else "live_nomis",
        "source_page": "https://www.nomisweb.co.uk/sources/census_2021",
    }


@mcp.tool()
def get_deprivation_by_borough(borough_name: str) -> dict[str, Any]:
    """IMD 2025 deprivation summary for a London borough (LSOA aggregation)."""
    borough = resolve_borough(borough_name)
    path = ensure_imd()
    search = alias_borough(borough)

    row = duckdb.connect().execute(
        f"""
        SELECT
            COUNT(*) AS lsoa_count,
            AVG("Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)") AS avg_imd_decile,
            AVG("Index of Multiple Deprivation (IMD) Score") AS avg_imd_score,
            SUM(CASE
                WHEN "Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)" = 1
                THEN 1 ELSE 0
            END) AS lsoas_in_most_deprived_decile
        FROM read_parquet(?)
        WHERE lower("Local Authority District name (2024)") IN (lower(?), lower(?))
           OR "Local Authority District code (2024)" = ?
        """,
        [path, borough, search, BOROUGH_GSS.get(borough, "")],
    ).fetchone()

    return {
        "borough": borough,
        "lsoa_count": int(row[0] or 0),
        "avg_imd_decile": round(row[1], 2) if row[1] is not None else None,
        "avg_imd_score": round(row[2], 2) if row[2] is not None else None,
        "lsoas_in_bottom_decile": int(row[3] or 0),
        "source": "https://deprivation.communities.gov.uk/",
        "note": "Decile 1 = most deprived 10% of LSOAs nationally",
    }


@mcp.tool()
def get_deprivation_by_postcode(postcode: str) -> dict[str, Any]:
    """IMD 2025 score/decile for the LSOA containing a postcode."""
    location = geocode_postcode(postcode)
    lsoa = location.get("lsoa_code")
    if not lsoa:
        return {"error": "No LSOA code returned for postcode", "postcode_lookup": location}

    path = ensure_imd()
    row = duckdb.connect().execute(
        f"""
        SELECT
            "LSOA name (2021)",
            "Local Authority District name (2024)",
            "Index of Multiple Deprivation (IMD) Score",
            "Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)",
            "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)"
        FROM read_parquet(?)
        WHERE "LSOA code (2021)" = ?
        """,
        [path, lsoa],
    ).fetchone()

    if not row:
        return {"error": f"No IMD record for LSOA {lsoa}", "postcode_lookup": location}

    return {
        "postcode": location["postcode"],
        "lsoa_code": lsoa,
        "lsoa_name": row[0],
        "borough": row[1],
        "imd_score": row[2],
        "imd_decile": row[3],
        "imd_rank": row[4],
        "source": "https://deprivation.communities.gov.uk/",
        "postcode_lookup": location,
    }


@mcp.tool()
def get_housing_in_london_by_borough(
    borough_name: str,
    indicator: str | None = None,
) -> dict[str, Any]:
    """GLA Housing in London indicators for a borough (from local tables parquet)."""
    borough = resolve_borough(borough_name)
    path = ensure_housing_london()
    search = alias_borough(borough)
    gss = BOROUGH_GSS.get(borough, "")

    params: list[Any] = [path, borough, search, gss]
    indicator_filter = ""
    if indicator:
        indicator_filter = "AND lower(indicator) LIKE '%' || lower(?) || '%'"
        params.append(indicator)

    rows = duckdb.connect().execute(
        f"""
        SELECT sheet, indicator, value
        FROM read_parquet(?)
        WHERE lower(borough_name) IN (lower(?), lower(?))
           OR gss_code = ?
        {indicator_filter}
        ORDER BY sheet, indicator
        LIMIT 80
        """,
        params,
    ).fetchall()

    indicators = [
        {"sheet": r[0], "indicator": r[1], "value": r[2]}
        for r in rows
    ]

    return {
        "borough": borough,
        "indicator_filter": indicator,
        "indicators": indicators,
        "count": len(indicators),
        "source": "https://data.london.gov.uk/dataset/housing-london/",
        "report": "Housing in London 2024 tables",
    }


if __name__ == "__main__":
    mcp.run()
