create table if not exists gm_notes (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    scene_id uuid references campaign_scenes(id) on delete set null,
    token_id uuid references scene_tokens(id) on delete set null,
    author_user_id uuid references users(id) on delete set null,
    title text not null default '',
    content text not null default '',
    visibility text not null default 'gm_team' check (visibility in ('gm_team', 'author_only')),
    version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists gm_notes_campaign_id_idx on gm_notes(campaign_id);
create index if not exists gm_notes_scene_id_idx on gm_notes(scene_id);
create index if not exists gm_notes_token_id_idx on gm_notes(token_id);
create index if not exists gm_notes_author_user_id_idx on gm_notes(author_user_id);
create index if not exists gm_notes_campaign_updated_idx on gm_notes(campaign_id, updated_at desc);
