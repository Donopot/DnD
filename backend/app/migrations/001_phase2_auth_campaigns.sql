create extension if not exists pgcrypto;

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    display_name text not null,
    password_hash text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_unique on users (lower(email));

create table if not exists campaigns (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references users(id) on delete cascade,
    name text not null,
    description text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists campaign_members (
    campaign_id uuid not null references campaigns(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    role text not null check (role in ('gm', 'co_gm', 'player')),
    joined_at timestamptz not null default now(),
    primary key (campaign_id, user_id)
);

create index if not exists campaign_members_user_id_idx on campaign_members(user_id);

create table if not exists campaign_invites (
    token text primary key,
    campaign_id uuid not null references campaigns(id) on delete cascade,
    created_by_user_id uuid not null references users(id) on delete cascade,
    role text not null default 'player' check (role in ('co_gm', 'player')),
    expires_at timestamptz,
    max_uses integer,
    use_count integer not null default 0,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists campaign_invites_campaign_id_idx on campaign_invites(campaign_id);

