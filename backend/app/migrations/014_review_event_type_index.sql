-- Review fix: add index for combat_log event_type filtering
-- Used by player-facing combat log queries filtering by event_type

create index if not exists combat_log_event_type_idx on combat_log(event_type);
