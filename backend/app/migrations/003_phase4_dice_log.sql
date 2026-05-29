create table if not exists dice_rolls (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    character_id uuid references characters(id) on delete set null,
    visibility text not null default 'public' check (visibility in ('public', 'gm')),
    label text not null default '',
    formula text not null,
    mode text not null default 'normal' check (mode in ('normal', 'advantage', 'disadvantage')),
    total integer not null,
    detail jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists dice_rolls_campaign_id_created_at_idx
    on dice_rolls(campaign_id, created_at desc);

create table if not exists game_log_entries (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    user_id uuid references users(id) on delete set null,
    character_id uuid references characters(id) on delete set null,
    entry_type text not null check (entry_type in ('roll', 'note', 'system')),
    visibility text not null default 'public' check (visibility in ('public', 'gm')),
    message text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists game_log_entries_campaign_id_created_at_idx
    on game_log_entries(campaign_id, created_at desc);

