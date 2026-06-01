-- Phase 15: Journal de campagne structuré

alter table game_log_entries
    add column if not exists category text not null default 'general'
        check (category in ('general', 'combat', 'rp', 'exploration', 'gm_note')),
    add column if not exists linked_scene_id uuid references campaign_scenes(id) on delete set null,
    add column if not exists linked_encounter_id uuid references combat_encounters(id) on delete set null,
    add column if not exists linked_character_id uuid references characters(id) on delete set null,
    add column if not exists pinned boolean not null default false,
    add column if not exists session_marker boolean not null default false;

create index if not exists game_log_category_idx on game_log_entries(campaign_id, category);
create index if not exists game_log_pinned_idx on game_log_entries(campaign_id, pinned);
create index if not exists game_log_session_idx on game_log_entries(campaign_id, session_marker, created_at desc);
