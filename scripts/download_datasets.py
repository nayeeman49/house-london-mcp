#!/usr/bin/env python3
"""Download public datasets for the Housing Intent Engine MCP."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.datasets import (  # noqa: E402
    LOCAL_CENSUS,
    LOCAL_HOUSING,
    LOCAL_IMD,
    LOCAL_WTB,
    dataset_status,
    ensure_census,
    ensure_housing_london,
    ensure_imd,
)


def main() -> None:
    print("House London MCP — dataset downloader\n")

    print("1/3 IMD 2025 (deprivation.communities.gov.uk)…")
    ensure_imd()
    print(f"   ✓ {LOCAL_IMD}")

    print("2/3 Census 2021 LTLA (nomisweb.co.uk)…")
    ensure_census()
    print(f"   ✓ {LOCAL_CENSUS}")

    print("3/3 Housing in London 2024 tables (data.london.gov.uk)…")
    ensure_housing_london()
    print(f"   ✓ {LOCAL_HOUSING}")

    print("\nWhereToBuild (wheretobuild.warwick.ac.uk):")
    if Path(LOCAL_WTB).exists():
        print(f"   ✓ {LOCAL_WTB} already present")
    else:
        print("   ✗ NOT publicly downloadable")
        print("     Obtain data/wheretobuild.parquet from House London hackathon organisers")
        print("     (event-only data use agreement — do not redistribute publicly)")

    print("\nStatus:", dataset_status())
    print("\nDone. Restart MCP / dev server to pick up new tools.")


if __name__ == "__main__":
    main()
