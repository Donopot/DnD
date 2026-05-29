# DnD SaaS

Second SaaS for a Dungeons & Dragons browser-first VTT, designed to run isolated
from the existing documentary SaaS on the HP Mini.

## Phase 1 Scope

This repository contains the infrastructure and minimal app skeleton:

- dedicated frontend service;
- dedicated FastAPI backend service;
- dedicated PostgreSQL database;
- dedicated MinIO object storage;
- dedicated Redis instance;
- dedicated Docker network;
- separated environment file;
- separated backup scripts;
- Caddy routing example for `dnd.dtmini.com`.

The only intended shared component with the documentary SaaS is the host-level
Caddy entrypoint.

## Local Start

Copy the environment file:

```bash
cp .env.example .env
```

Start the stack:

```bash
docker compose up -d --build
```

Open:

- frontend: http://127.0.0.1:8090
- backend health: http://127.0.0.1:8091/api/health

## Production Layout

Recommended server path on the HP Mini:

```txt
/home/donopot/dnd-saas
  .env
  docker-compose.yml
  data/
  backups/
  logs/
```

Do not reuse credentials, databases, buckets, volumes or `.env` files from the
documentary SaaS.

## Caddy

Use `infra/caddy/Caddyfile.dnd.example` as the routing reference. The preferred
production shape is:

- `https://dnd.dtmini.com` -> DnD frontend
- `https://dnd.dtmini.com/api/*` -> DnD backend
- `https://dnd.dtmini.com/ws/*` -> DnD backend websocket endpoints

## Backups

Scripts are provided in `scripts/`:

- `backup-postgres.sh`
- `backup-minio.sh`
- `smoke-phase2.sh`

They write to `./backups` by default when run from the repository root on the
server.

## Current Product Phase

Phase 2 is implemented in the app skeleton:

- email/password auth;
- JWT session token;
- campaign creation and listing;
- campaign members;
- player invitation links;
- minimal React dashboard.

Run the smoke test on the HP Mini:

```bash
cd /home/donopot/dnd-saas
sh scripts/smoke-phase2.sh
```
