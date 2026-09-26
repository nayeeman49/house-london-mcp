# Deploy HouseData Engine as a public web app

This project is **not a good fit for Vercel-only hosting**. The dashboard spawns a **local Python MCP process** and reads **Parquet files on disk**. Deploy it as **one Docker container** (Next.js + Python + data).

## Recommended platforms

| Platform | Best for | Free tier |
|---|---|---|
| **[Railway](https://railway.app)** | Easiest Docker deploy | Limited credits |
| **[Render](https://render.com)** | Stable public URL | Free web service (cold starts) |
| **[Fly.io](https://fly.io)** | EU region, more control | Small free allowance |

Use **Railway** or **Render** unless you already run Kubernetes.

## What gets deployed

```
Docker container
├── Python venv + MCP (src/server.py)
├── data/foundations.parquet (+ IMD, Census, HiL downloaded at build)
└── Next.js (web/) on PORT
```

Each `/api/map`, `/api/chat`, `/api/mcp` request spawns Python briefly — same as local dev.

## 1. Push to GitHub

Do **not** commit secrets or parquet files (they are gitignored). The Dockerfile downloads public datasets at build time.

```bash
cd house-london-mcp
git init   # if needed
git add Dockerfile .dockerignore render.yaml DEPLOY.md README.md src scripts web requirements.txt
git commit -m "Add Docker deployment"
git remote add origin https://github.com/YOU/house-london-mcp.git
git push -u origin main
```

## 2. Deploy on Railway (simplest)

1. [railway.app](https://railway.app) → **New project** → **Deploy from GitHub repo**
2. Railway detects the `Dockerfile` automatically
3. **Variables** → add:

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | your key (optional if `USE_MCP_ONLY=true`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token (for `/map`) |
| `USE_MCP_ONLY` | `true` for public demo (no OpenAI charges/abuse) |
| `OPENAI_MODEL` | `gpt-4o-mini` |

Built-in (Dockerfile sets these): `HOUSING_PROJECT_ROOT`, `MCP_PYTHON`, `MCP_SERVER`.

4. **Settings** → generate domain → `https://your-app.up.railway.app`

**Plan:** use at least **512MB–1GB RAM** (DuckDB + map queries).

## 3. Deploy on Render

1. **New** → **Blueprint** → connect repo (uses `render.yaml`), **or** **Web Service** → Docker
2. Add the same env vars as above
3. Render assigns `https://housedata-engine.onrender.com`

Free tier sleeps after inactivity — first load may take ~30s.

## 4. Test locally with Docker first

```bash
cd house-london-mcp
docker build -t housedata-engine .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token \
  -e USE_MCP_ONLY=true \
  housedata-engine
```

Open **http://localhost:3000**

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | For map | Mapbox → restrict URL to your domain in production |
| `OPENAI_API_KEY` | For GPT chat | Skip if `USE_MCP_ONLY=true` |
| `USE_MCP_ONLY` | Recommended public | `true` = live MCP answers, no OpenAI |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `HOUSING_PROJECT_ROOT` | Auto in Docker | `/app` |
| `MCP_PYTHON` / `MCP_SERVER` | Auto in Docker | Set in Dockerfile |

## What not to deploy publicly

- **`data/wheretobuild.parquet`** — hackathon-only; do not ship in public builds
- **`.env.local`** — use platform secret env vars instead

## Why not Vercel?

Vercel runs **serverless Node functions**, not a persistent Python venv + 40MB+ Parquet on disk. You would need to:

1. Host MCP as a separate HTTP API (Railway/FastAPI), **or**
2. Rewrite all DuckDB tools in TypeScript

That is a larger refactor. Docker on Railway/Render matches how the app works today.

## Optional hardening for public use

- Set `USE_MCP_ONLY=true` until you add rate limits
- Restrict Mapbox token to your production domain
- Add basic auth on Render/Railway if the demo is not fully public
- Monitor OpenAI usage if you enable chat

## Custom domain

Both Railway and Render support CNAME → your domain (e.g. `housedata.yourdomain.com`) in project settings.
