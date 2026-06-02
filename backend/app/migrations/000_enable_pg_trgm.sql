-- Migration 000: required PostgreSQL extensions
-- Required by GIN trigram indexes using gin_trgm_ops.
create extension if not exists pg_trgm;
