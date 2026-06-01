-- Migration 019: Character management — XP tracking + conditions
alter table characters add column if not exists xp integer not null default 0 check (xp >= 0);
alter table characters add column if not exists conditions jsonb not null default '[]'::jsonb;

-- Re-create index for status (used by vault/submission queries)
create index if not exists characters_status_idx on characters(status);
