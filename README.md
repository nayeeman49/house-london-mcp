# House London MCP Housing Engine

Planning data tools + **Foundations Evidence Desk** dashboard for the House London hackathon.

## Project structure

```
house-london-mcp/
├── src/server.py          # MCP server (15 tools)
├── scripts/run_mcp_tool.py # Python CLI bridge for the dashboard
├── data/foundations.parquet # Download once (~24MB)
├── web/                   # Next.js dashboard (Evidence Desk)
└── .cursor/mcp.json       # Cursor MCP config
```

## Setup

### 1. Python MCP server

```bash
cd /Users/user/Documents/Projects/house-london-mcp
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

mkdir -p data
curl -L "https://foreman.house-london.uk/download/parquet/" -o data/foundations.parquet

# IMD, Census 2021, Housing in London (auto-download, ~15MB total)
python scripts/download_datasets.py
```

### Optional: WhereToBuild (hackathon only)

**Not publicly downloadable.** Ask House London organisers for `wheretobuild.parquet` and place it at:

```
data/wheretobuild.parquet
```

Event-only data — do not redistribute publicly.

### 2. Dashboard

```bash
cd web
cp .env.local.example .env.local   # edit paths if needed
npm install
npm run dev
```

Open **http://localhost:3001**

## MCP tools

| Tool | Data source |
|---|---|
| `list_data_sources` | Shows which local files are loaded |
| `get_repeat_application_burden` | Foundations |
| `get_deadline_bunching_by_borough` | Foundations |
| `get_small_site_approval_gap` | Foundations |
| `get_planning_friction_by_borough` | Foundations |
| `get_london_borough_map_metrics` | Foundations |
| `get_geocoded_applications` | Foundations |
| `get_wheretobuild_by_borough` | Warwick WhereToBuild (local parquet) |
| `get_wheretobuild_by_postcode` | WhereToBuild + postcodes.io |
| `get_census_stats_by_borough` | [Nomis Census 2021](https://www.nomisweb.co.uk/sources/census_2021) |
| `get_deprivation_by_borough` | [IMD 2025](https://deprivation.communities.gov.uk/) |
| `get_deprivation_by_postcode` | IMD + postcodes.io |
| `get_housing_in_london_by_borough` | [Housing in London](https://data.london.gov.uk/dataset/housing-london/) |
| `search_planning_constraints` | Planning Data API |
| `search_uk_planit_applications` | UK PlanIt |

## How MCP connects

The dashboard calls `/api/mcp` which:

1. Tries **MCP SDK** stdio transport → spawns `src/server.py`
2. Falls back to **Python bridge** → `scripts/run_mcp_tool.py`

Both hit the same tool functions.

## Cursor

Reload MCP in Settings. Config in `.cursor/mcp.json` and `~/.cursor/mcp.json`.

## Deploy publicly

See **[DEPLOY.md](./DEPLOY.md)** — Docker on **Railway** or **Render** (not Vercel-only).

Quick test:

```bash
docker build -t housedata-engine .
docker run -p 3000:3000 -e USE_MCP_ONLY=true -e NEXT_PUBLIC_MAPBOX_TOKEN=pk... housedata-engine
```

## Test Python tools

```bash
source venv/bin/activate
python -c "from src.server import get_repeat_application_burden; print(get_repeat_application_burden())"
```
