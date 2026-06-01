-- Phase 10: Handouts — documents de campagne partageables
-- Permet au MJ de créer des documents visibles par les joueurs ou privés

create table if not exists handouts (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    author_user_id uuid not null references users(id) on delete cascade,
    title text not null default '',
    content text not null default '',
    visibility text not null default 'gm'
        check (visibility in ('public', 'players', 'gm', 'gm_team')),
    asset_id uuid references campaign_assets(id) on delete set null,
    scene_id uuid references campaign_scenes(id) on delete set null,
    is_revealed boolean not null default false,
    revealed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists handouts_campaign_id_idx on handouts(campaign_id);
create index if not exists handouts_author_user_id_idx on handouts(author_user_id);
create index if not exists handouts_visibility_idx on handouts(visibility);
create index if not exists handouts_campaign_updated_idx on handouts(campaign_id, updated_at desc);
create index if not exists handouts_scene_id_idx on handouts(scene_id);
