"""Local dataset paths, borough joins, and download helpers."""

from __future__ import annotations

import io
import os
import zipfile
from typing import Any

import duckdb
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

IMD_CSV_URL = (
    "https://assets.publishing.service.gov.uk/media/691ded56d140bbbaa59a2a7d/"
    "File_7_IoD2025_All_Ranks_Scores_Deciles_Population_Denominators.csv"
)
CENSUS_POP_ZIP = "https://www.nomisweb.co.uk/output/census/2021/census2021-ts008.zip"
CENSUS_HH_ZIP = "https://www.nomisweb.co.uk/output/census/2021/census2021-ts017.zip"
HOUSING_LONDON_XLSX_URL = (
    "https://data.london.gov.uk/download/24rpx/91891e73-dd18-4386-a66f-58f148cd7069/"
    "Housing%20in%20London%202024%20-%20web.xlsx"
)

LOCAL_IMD = os.path.join(DATA_DIR, "imd2025.parquet")
LOCAL_CENSUS = os.path.join(DATA_DIR, "census2021_ltla.parquet")
LOCAL_HOUSING = os.path.join(DATA_DIR, "housing_in_london.parquet")
LOCAL_WTB = os.path.join(DATA_DIR, "wheretobuild.parquet")

# Foundations area_name -> other datasets
BOROUGH_ALIASES: dict[str, str] = {
    "City": "City of London",
    "Kensington": "Kensington and Chelsea",
}

BOROUGH_GSS: dict[str, str] = {
    "Barking and Dagenham": "E09000002",
    "Barnet": "E09000003",
    "Bexley": "E09000004",
    "Brent": "E09000005",
    "Bromley": "E09000006",
    "Camden": "E09000007",
    "City": "E09000001",
    "Croydon": "E09000008",
    "Ealing": "E09000009",
    "Enfield": "E09000010",
    "Greenwich": "E09000011",
    "Hackney": "E09000012",
    "Hammersmith and Fulham": "E09000013",
    "Haringey": "E09000014",
    "Harrow": "E09000015",
    "Havering": "E09000016",
    "Hillingdon": "E09000017",
    "Hounslow": "E09000018",
    "Islington": "E09000019",
    "Kensington": "E09000020",
    "Kingston": "E09000021",
    "Lambeth": "E09000022",
    "Lewisham": "E09000023",
    "Merton": "E09000024",
    "Newham": "E09000025",
    "Redbridge": "E09000026",
    "Richmond": "E09000027",
    "Southwark": "E09000028",
    "Sutton": "E09000029",
    "Tower Hamlets": "E09000030",
    "Waltham Forest": "E09000031",
    "Wandsworth": "E09000032",
    "Westminster": "E09000033",
    "London Legacy": "E09000034",
    "Old Oak Park Royal": "E09000035",
}


def alias_borough(name: str) -> str:
    return BOROUGH_ALIASES.get(name.strip(), name.strip())


def resolve_borough(name: str, known: set[str] | None = None) -> str:
    cleaned = name.strip()
    if known and cleaned in known:
        return cleaned
    for canonical, alias in BOROUGH_ALIASES.items():
        if cleaned.lower() == alias.lower():
            return canonical
        if cleaned.lower() == canonical.lower():
            return canonical
    for b in BOROUGH_GSS:
        if b.lower() == cleaned.lower():
            return b
        if alias_borough(b).lower() == cleaned.lower():
            return b
    raise ValueError(f"Unknown borough '{name}'")


def dataset_status() -> dict[str, Any]:
    return {
        "foundations": os.path.exists(
            os.path.join(DATA_DIR, "foundations.parquet")
        ),
        "wheretobuild": os.path.exists(LOCAL_WTB),
        "imd2025": os.path.exists(LOCAL_IMD),
        "census2021_ltla": os.path.exists(LOCAL_CENSUS),
        "housing_in_london": os.path.exists(LOCAL_HOUSING),
    }


def _download(url: str, dest: str) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest):
        return
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    with open(dest, "wb") as handle:
        handle.write(response.content)


def ensure_imd() -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(LOCAL_IMD):
        return LOCAL_IMD
    csv_path = os.path.join(DATA_DIR, "imd2025.csv")
    _download(IMD_CSV_URL, csv_path)
    con = duckdb.connect()
    con.execute(
        f"""
        COPY (
            SELECT * FROM read_csv('{csv_path}', header=true, auto_detect=true)
        ) TO '{LOCAL_IMD}' (FORMAT PARQUET)
        """
    )
    return LOCAL_IMD


def ensure_census() -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(LOCAL_CENSUS):
        return LOCAL_CENSUS

    pop_zip = requests.get(CENSUS_POP_ZIP, timeout=120).content
    hh_zip = requests.get(CENSUS_HH_ZIP, timeout=120).content

    with zipfile.ZipFile(io.BytesIO(pop_zip)) as zf:
        pop_csv = zf.read("census2021-ts008-ltla.csv").decode("utf-8")
    with zipfile.ZipFile(io.BytesIO(hh_zip)) as zf:
        hh_csv = zf.read("census2021-ts017-ltla.csv").decode("utf-8")

    pop_path = os.path.join(DATA_DIR, "census2021-ts008-ltla.csv")
    hh_path = os.path.join(DATA_DIR, "census2021-ts017-ltla.csv")
    with open(pop_path, "w", encoding="utf-8") as f:
        f.write(pop_csv)
    with open(hh_path, "w", encoding="utf-8") as f:
        f.write(hh_csv)

    con = duckdb.connect()
    con.execute(
        f"""
        COPY (
            SELECT
                p."geography code" AS gss_code,
                p.geography AS borough_name,
                TRY_CAST(p."Sex: All persons; measures: Value" AS BIGINT) AS population,
                TRY_CAST(h."Household size: Total: All household spaces; measures: Value" AS BIGINT) AS households
            FROM read_csv('{pop_path}', header=true) p
            JOIN read_csv('{hh_path}', header=true) h
              ON p."geography code" = h."geography code"
            WHERE p."geography code" LIKE 'E09%'
        ) TO '{LOCAL_CENSUS}' (FORMAT PARQUET)
        """
    )
    return LOCAL_CENSUS


def ensure_housing_london() -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(LOCAL_HOUSING):
        return LOCAL_HOUSING

    xlsx_path = os.path.join(DATA_DIR, "housing_in_london_2024.xlsx")
    _download(HOUSING_LONDON_XLSX_URL, xlsx_path)

    import openpyxl

    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    rows_out: list[dict[str, Any]] = []

    for sheet_name in wb.sheetnames:
        if sheet_name in {"Front", "Content"}:
            continue
        ws = wb[sheet_name]
        all_rows = list(ws.iter_rows(values_only=True))
        header_idx = None
        header: tuple[Any, ...] | None = None
        for idx, row in enumerate(all_rows):
            if row and str(row[0]).strip().lower() in {"code", "gss", "lad code"}:
                header_idx = idx
                header = row
                break
        if header is None or header_idx is None:
            continue

        col_map = {str(c).strip().lower(): i for i, c in enumerate(header) if c}
        code_i = col_map.get("code", col_map.get("gss", col_map.get("lad code")))
        la_i = col_map.get("la", col_map.get("borough", col_map.get("local authority")))
        if code_i is None:
            continue

        for row in all_rows[header_idx + 1 :]:
            if not row or not row[code_i]:
                continue
            code = str(row[code_i])
            if not code.startswith("E09"):
                continue
            borough = str(row[la_i]).strip() if la_i is not None and row[la_i] else None
            for col_name, col_i in col_map.items():
                if col_name in {"code", "gss", "lad code", "la", "borough", "region"}:
                    continue
                val = row[col_i]
                if val is None or val == "":
                    continue
                rows_out.append(
                    {
                        "sheet": sheet_name,
                        "indicator": col_name,
                        "gss_code": code,
                        "borough_name": borough,
                        "value": val,
                    }
                )

    import polars as pl

    pl.DataFrame(rows_out).write_parquet(LOCAL_HOUSING)
    return LOCAL_HOUSING


def _nomis_obs_value(csv_text: str) -> tuple[str | None, str | None, int | None]:
    import csv

    rows = list(csv.reader(csv_text.strip().splitlines()))
    if len(rows) < 2:
        return None, None, None
    header = [h.lower() for h in rows[0]]
    data = rows[1]
    name = data[header.index("geography_name")] if "geography_name" in header else None
    code = data[header.index("geography_code")] if "geography_code" in header else None
    value = int(float(data[header.index("obs_value")])) if "obs_value" in header else None
    return name, code, value


def fetch_nomis_borough(gss_code: str) -> dict[str, Any]:
    pop_url = (
        "https://www.nomisweb.co.uk/api/v01/dataset/NM_2028_1.data.csv"
        f"?geography={gss_code}&time=latest&c_sex=0&measures=20100"
        "&select=geography_code,geography_name,obs_value"
    )
    hh_url = (
        "https://www.nomisweb.co.uk/api/v01/dataset/NM_2037_1.data.csv"
        f"?geography={gss_code}&time=latest&c2021_hhsize_10=0&measures=20100"
        "&select=geography_code,geography_name,obs_value"
    )
    pop_name, pop_code, pop_val = _nomis_obs_value(requests.get(pop_url, timeout=30).text)
    _, _, hh_val = _nomis_obs_value(requests.get(hh_url, timeout=30).text)
    return {
        "gss_code": pop_code or gss_code,
        "borough_name": pop_name,
        "population": pop_val,
        "households": hh_val,
        "source": "nomis_api",
    }


def enrich_borough_map_records(
    boroughs: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, bool]]:
    """Merge Census, IMD, Housing in London, and WhereToBuild into map borough rows."""
    layers = {
        "census2021": False,
        "imd2025": False,
        "housing_in_london": False,
        "wheretobuild": False,
    }
    con = duckdb.connect()

    census_by_gss: dict[str, dict[str, int]] = {}
    if os.path.exists(LOCAL_CENSUS):
        layers["census2021"] = True
        for gss, pop, hh in con.execute(
            f"SELECT gss_code, population, households FROM read_parquet('{LOCAL_CENSUS}')"
        ).fetchall():
            if gss:
                census_by_gss[str(gss)] = {
                    "population": int(pop) if pop is not None else None,
                    "households": int(hh) if hh is not None else None,
                }

    imd_by_gss: dict[str, dict[str, float]] = {}
    if os.path.exists(LOCAL_IMD):
        layers["imd2025"] = True
        for gss, decile, score in con.execute(
            f"""
            SELECT
                "Local Authority District code (2024)",
                AVG("Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)"),
                AVG("Index of Multiple Deprivation (IMD) Score")
            FROM read_parquet('{LOCAL_IMD}')
            WHERE "Local Authority District code (2024)" LIKE 'E09%'
            GROUP BY 1
            """
        ).fetchall():
            if gss:
                imd_by_gss[str(gss)] = {
                    "avg_imd_decile": round(float(decile), 2) if decile is not None else None,
                    "avg_imd_score": round(float(score), 1) if score is not None else None,
                }

    stock_change_by_gss: dict[str, float] = {}
    if os.path.exists(LOCAL_HOUSING):
        layers["housing_in_london"] = True
        for gss, val in con.execute(
            f"""
            SELECT gss_code, value FROM read_parquet('{LOCAL_HOUSING}')
            WHERE sheet = '2.1 Stock Change' AND indicator = 'pc_change'
            """
        ).fetchall():
            if gss and val is not None:
                stock_change_by_gss[str(gss)] = round(float(val) * 100, 2)

    wtb_by_borough: dict[str, dict[str, float | None]] = {}
    if os.path.exists(LOCAL_WTB):
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
        if borough_col and gap_col:
            layers["wheretobuild"] = True
            tight_sql = f"AVG({tight_col})" if tight_col else "NULL"
            for name, gap, tight in con.execute(
                f"""
                SELECT lower({borough_col}), AVG({gap_col}), {tight_sql}
                FROM read_parquet('{LOCAL_WTB}')
                GROUP BY 1
                """
            ).fetchall():
                wtb_by_borough[str(name)] = {
                    "avg_housing_gap": round(float(gap), 4) if gap is not None else None,
                    "avg_housing_tightness": round(float(tight), 4) if tight is not None else None,
                }

    for record in boroughs:
        borough = record["borough"]
        gss = BOROUGH_GSS.get(borough, "")
        if gss in census_by_gss:
            record.update(census_by_gss[gss])
        if gss in imd_by_gss:
            record.update(imd_by_gss[gss])
        if gss in stock_change_by_gss:
            record["housing_stock_pct_change"] = stock_change_by_gss[gss]
        wtb_key = borough.lower()
        alias = alias_borough(borough).lower()
        wtb = wtb_by_borough.get(wtb_key) or wtb_by_borough.get(alias)
        if wtb:
            record.update(wtb)

    return boroughs, layers


def geocode_postcode(postcode: str) -> dict[str, Any]:
    normalized = postcode.replace(" ", "").upper()
    response = requests.get(
        f"https://api.postcodes.io/postcodes/{normalized}",
        timeout=10,
    )
    response.raise_for_status()
    result = response.json()["result"]
    codes = result.get("codes") or {}
    return {
        "postcode": result["postcode"],
        "latitude": result["latitude"],
        "longitude": result["longitude"],
        "borough": result.get("admin_district"),
        "lsoa_code": codes.get("lsoa"),
        "msoa_code": codes.get("msoa"),
        "oa_code": codes.get("oa21"),
    }
