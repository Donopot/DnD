#!/usr/bin/env sh
set -eu

if [ -f ./.env ]; then
  set -a
  . ./.env
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

docker compose exec -T dnd-postgres pg_dump \
  -U "${POSTGRES_USER:-dnd_app}" \
  -d "${POSTGRES_DB:-dnd_app}" \
  --format=custom \
  > "$BACKUP_DIR/dnd-postgres-$TIMESTAMP.dump"

find "$BACKUP_DIR" -type f -name "dnd-postgres-*.dump" -mtime +14 -delete
