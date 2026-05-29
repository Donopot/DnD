create table if not exists campaign_assets (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    uploader_user_id uuid references users(id) on delete set null,
    name text not null,
    object_key text not null unique,
    content_type text not null,
    size_bytes integer not null check (size_bytes > 0),
    asset_type text not null default 'map' check (asset_type in ('map', 'token', 'handout')),
    created_at timestamptz not null default now()
);

create index if not exists campaign_assets_campaign_id_idx
on campaign_assets(campaign_id);

alter table campaign_scenes
add column if not exists background_asset_id uuid references campaign_assets(id) on delete set null;

create index if not exists campaign_scenes_background_asset_id_idx
on campaign_scenes(background_asset_id);
