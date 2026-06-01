-- Phase 11: Conditions et états de combat
-- Ajoute un journal de combat et structure les conditions

create table if not exists combat_log (
    id uuid primary key default gen_random_uuid(),
    encounter_id uuid not null references combat_encounters(id) on delete cascade,
    campaign_id uuid not null references campaigns(id) on delete cascade,
    combatant_id uuid references combatants(id) on delete set null,
    actor_user_id uuid references users(id) on delete set null,
    event_type text not null check (event_type in (
        'condition_applied', 'condition_removed',
        'damage', 'heal', 'defeated', 'revived'
    )),
    payload jsonb not null default '{}',
    created_at timestamptz not null default now()
);

create index if not exists combat_log_encounter_idx on combat_log(encounter_id);
create index if not exists combat_log_campaign_idx on combat_log(campaign_id, created_at desc);
create index if not exists combat_log_combatant_idx on combat_log(combatant_id);
