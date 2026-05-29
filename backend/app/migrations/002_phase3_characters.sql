create table if not exists characters (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    owner_user_id uuid references users(id) on delete set null,
    name text not null,
    ancestry text not null default '',
    class_name text not null default '',
    level integer not null default 1 check (level between 1 and 20),
    armor_class integer not null default 10 check (armor_class between 1 and 40),
    speed integer not null default 30 check (speed between 0 and 200),
    proficiency_bonus integer not null default 2 check (proficiency_bonus between 2 and 8),
    hp_current integer not null default 1 check (hp_current >= 0),
    hp_max integer not null default 1 check (hp_max >= 1),
    attributes jsonb not null default '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
    skills jsonb not null default '{}'::jsonb,
    saving_throws jsonb not null default '{}'::jsonb,
    attacks jsonb not null default '[]'::jsonb,
    inventory jsonb not null default '[]'::jsonb,
    spells jsonb not null default '[]'::jsonb,
    resources jsonb not null default '[]'::jsonb,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists characters_campaign_id_idx on characters(campaign_id);
create index if not exists characters_owner_user_id_idx on characters(owner_user_id);

