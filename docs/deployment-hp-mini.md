# HP Mini Deployment

This procedure installs the DnD SaaS beside the existing documentary SaaS while
keeping application components separated.

## 1. DNS

Create an `A` or `CNAME` record for:

```txt
dnd.dtmini.com
```

Point it to the same public entry used by the HP Mini.

## 2. Server Directory

On the HP Mini:

```bash
mkdir -p /home/donopot/dnd-saas
cd /home/donopot/dnd-saas
```

Clone the dedicated DnD repository here.

Do not modify the existing documentary SaaS in:

```txt
/home/donopot/mon-saas
/home/donopot/vph-saas
```

## 3. Environment

```bash
cp .env.example .env
nano .env
```

Replace every `change-me-*` value. Do not reuse any secret from the documentary
SaaS.

Recommended production CORS value:

```txt
BACKEND_CORS_ORIGINS=https://dnd.dtmini.com
```

## 4. Start DnD Stack

```bash
docker compose up -d --build
```

Expected private containers:

```txt
dnd-frontend
dnd-backend
dnd-postgres
dnd-minio
dnd-minio-init
dnd-redis
```

Only these host ports should be bound, and only on loopback:

```txt
127.0.0.1:8090 -> dnd-frontend
127.0.0.1:8091 -> dnd-backend
```

## 5. Caddy

Add the block from `infra/caddy/Caddyfile.dnd.example` to the host-level Caddy
configuration, then reload Caddy.

Example:

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

If Caddy itself is containerized in the documentary stack, keep the same routing
logic but ensure it can reach the host loopback or use a deliberately shared
reverse-proxy-only Docker network. Do not attach Caddy to the DnD database,
MinIO or Redis services.

## 6. Smoke Tests

```bash
curl -fsS http://127.0.0.1:8091/api/health
curl -I http://127.0.0.1:8090
curl -fsS https://dnd.dtmini.com/api/health
```

The API health endpoint should report:

```json
{
  "service": "dnd-backend",
  "status": "ok",
  "database": "ok",
  "object_storage": "ok"
}
```

## 7. Backups

From `/home/donopot/dnd-saas`:

```bash
sh scripts/backup-postgres.sh
sh scripts/backup-minio.sh
```

Schedule them independently from the documentary SaaS backups.

Example cron entries:

```cron
15 2 * * * cd /home/donopot/dnd-saas && sh scripts/backup-postgres.sh
45 2 * * * cd /home/donopot/dnd-saas && sh scripts/backup-minio.sh
```

## 8. Update Procedure

```bash
cd /home/donopot/dnd-saas
git pull
docker compose up -d --build
```

Database migrations will be added during the product phases once the schema
exists.
