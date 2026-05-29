create table if not exists combat_encounters (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    scene_id uuid references campaign_scenes(id) on delete set null,
    name text not null,
    status text not null default 'draft' check (status in ('draft', 'active', 'ended')),
    round_number integer not null default 1 check (round_number >= 1),
    turn_index integer not null default 0 check (turn_index >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists combat_encounters_campaign_id_idx
on combat_encounters(campaign_id);

create index if not exists combat_encounters_scene_id_idx
on combat_encounters(scene_id);

create table if not exists combatants (
    id uuid primary key default gen_random_uuid(),
    encounter_id uuid not null references combat_encounters(id) on delete cascade,
    token_id uuid references scene_tokens(id) on delete set null,
    character_id uuid references characters(id) on delete set null,
    name text not null,
    initiative integer not null default 0,
    armor_class integer check (armor_class is null or (armor_class >= 1 and armor_class <= 40)),
    hp_current integer check (hp_current is null or hp_current >= 0),
    hp_max integer check (hp_max is null or hp_max >= 0),
    conditions jsonb not null default '[]'::jsonb,
    notes text not null default '',
    is_player_controlled boolean not null default false,
    is_hidden boolean not null default false,
    is_defeated boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists combatants_encounter_id_idx
on combatants(encounter_id);

create index if not exists combatants_token_id_idx
on combatants(token_id);

create index if not exists combatants_character_id_idx
on combatants(character_id);
