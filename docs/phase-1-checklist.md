# Phase 1 Checklist

## Isolation

- [ ] Dedicated repository for the DnD SaaS.
- [ ] Dedicated server path: `/home/donopot/dnd-saas`.
- [ ] Dedicated `.env`, never copied from the documentary SaaS.
- [ ] Dedicated Docker network: `dnd_internal`.
- [ ] Dedicated PostgreSQL volume: `dnd_postgres_data`.
- [ ] Dedicated MinIO volume: `dnd_minio_data`.
- [ ] Dedicated Redis volume: `dnd_redis_data`.
- [ ] Dedicated logs path: `/home/donopot/dnd-saas/logs`.
- [ ] Dedicated backups path: `/home/donopot/dnd-saas/backups`.

## Public Entry

- [ ] DNS record for `dnd.dtmini.com`.
- [ ] Caddy block added from `infra/caddy/Caddyfile.dnd.example`.
- [ ] Frontend reachable through HTTPS.
- [ ] `/api/health` reachable through HTTPS.
- [ ] `/ws/health` reachable through HTTPS websocket.

## Security

- [ ] Replace every `change-me-*` value in `.env`.
- [ ] Backend and frontend ports bound to `127.0.0.1` only.
- [ ] PostgreSQL has no host port mapping.
- [ ] MinIO has no host port mapping.
- [ ] Redis has no host port mapping.
- [ ] CORS restricted to `https://dnd.dtmini.com`.
- [ ] No documentary SaaS secret reused.

## Backups

- [ ] `scripts/backup-postgres.sh` tested.
- [ ] `scripts/backup-minio.sh` tested.
- [ ] Backup retention confirmed.
- [ ] Restore procedure documented before real user data exists.
