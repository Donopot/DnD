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
PARTIAL="$BACKUP_DIR/dnd-postgres-$TIMESTAMP.dump.partial"
FINAL="$BACKUP_DIR/dnd-postgres-$TIMESTAMP.dump"

docker compose exec -T dnd-postgres pg_dump \
  -U "${POSTGRES_USER:-dnd_app}" \
  -d "${POSTGRES_DB:-dnd_app}" \
  --format=custom \
  > "$PARTIAL"
mv "$PARTIAL" "$FINAL"

find "$BACKUP_DIR" -type f -name "dnd-postgres-*.dump" -mtime +14 -delete
find "$BACKUP_DIR" -type f -name "*.partial" -mtime +1 -delete
