#!/usr/bin/env sh
set -eu

if [ -f ./.env ]; then
  set -a
  . ./.env
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups/minio}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR_ABS="$(cd "$BACKUP_DIR" && pwd)"
PARTIAL="$BACKUP_DIR/dnd-assets-$TIMESTAMP.partial"
FINAL="$BACKUP_DIR/dnd-assets-$TIMESTAMP"

docker run --rm \
  --network dnd_internal \
  -e MC_HOST_dnd="http://${MINIO_ROOT_USER:-dnd_minio_admin}:${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}@dnd-minio:9000" \
  -v "$BACKUP_DIR_ABS:/backup" \
  minio/mc:RELEASE.2025-08-13T08-35-41Z \
  mirror "dnd/${MINIO_BUCKET:-dnd-assets}" "/backup/dnd-assets-$TIMESTAMP.partial"
mv "$PARTIAL" "$FINAL"

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name "dnd-assets-*" -mtime +14 -exec rm -rf {} +
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name "*.partial" -mtime +1 -exec rm -rf {} +
