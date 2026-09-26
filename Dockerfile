# HouseData Engine — Next.js dashboard + Python MCP in one container
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python MCP + DuckDB
COPY requirements.txt ./
RUN python3 -m venv /app/venv \
  && /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# App source (data/*.parquet excluded via .dockerignore — fetched below)
COPY src ./src
COPY scripts ./scripts

RUN mkdir -p data \
  && curl -fsSL "https://foreman.house-london.uk/download/parquet/" -o data/foundations.parquet \
  && /app/venv/bin/python scripts/download_datasets.py

# Next.js dashboard
COPY web/package.json web/package-lock.json ./web/
WORKDIR /app/web
RUN npm ci

COPY web ./
RUN npm run build

ENV NODE_ENV=production
ENV HOUSING_PROJECT_ROOT=/app
ENV MCP_PYTHON=/app/venv/bin/python
ENV MCP_SERVER=/app/src/server.py
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
