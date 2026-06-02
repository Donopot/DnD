#!/usr/bin/env bash
# DnD VTT — Database backup script
# Usage: ./scripts/backup-db.sh
# Outputs: backups/backup_<YYYY-MM-DD_HHMMSS>.sql.gz

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
DB_NAME="${DND_DB_NAME:-dnd_vtt}"
DB_USER="${DND_DB_USER:-dnd}"
DB_HOST="${DND_DB_HOST:-localhost}"
DB_PORT="${DND_DB_PORT:-5432}"
RETENTION_DAYS="${DND_BACKUP_RETENTION:-30}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
PARTIAL_FILE="${BACKUP_FILE}.partial"

echo "[$(date '+%H:%M:%S')] Dumping database '$DB_NAME' to $PARTIAL_FILE..."

PGPASSWORD="${DND_DB_PASSWORD:-}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  | gzip > "$PARTIAL_FILE"
mv "$PARTIAL_FILE" "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "[$(date '+%H:%M:%S')] Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Clean up old backups
DELETED=0
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | while read -r f; do
  echo "[$(date '+%H:%M:%S')] Pruned old backup: $f"
  DELETED=$((DELETED + 1))
done
find "$BACKUP_DIR" -name "*.partial" -mtime +1 -delete

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)
echo "[$(date '+%H:%M:%S')] Backups retained: $BACKUP_COUNT (pruning older than ${RETENTION_DAYS}d)"
