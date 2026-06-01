-- Phase 16: Fog of war — revealed zones stockées en JSONB sur la scène

alter table campaign_scenes
    add column if not exists fog_zones jsonb not null default '[]'::jsonb;

comment on column campaign_scenes.fog_zones is 'Array of revealed rectangular zones: [{x, y, width, height}, ...]';
