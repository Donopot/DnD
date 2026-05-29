create table if not exists campaign_scenes (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    description text not null default '',
    grid_size integer not null default 50 check (grid_size >= 16 and grid_size <= 200),
    width integer not null default 1600 check (width >= 200 and width <= 10000),
    height integer not null default 1000 check (height >= 200 and height <= 10000),
    background_url text,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists campaign_scenes_campaign_id_idx
on campaign_scenes(campaign_id);

create table if not exists scene_tokens (
    id uuid primary key default gen_random_uuid(),
    scene_id uuid not null references campaign_scenes(id) on delete cascade,
    character_id uuid references characters(id) on delete set null,
    name text not null,
    x integer not null default 0,
    y integer not null default 0,
    size integer not null default 1 check (size >= 1 and size <= 8),
    color text not null default '#7c3aed',
    is_hidden boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists scene_tokens_scene_id_idx
on scene_tokens(scene_id);

create index if not exists scene_tokens_character_id_idx
on scene_tokens(character_id);
