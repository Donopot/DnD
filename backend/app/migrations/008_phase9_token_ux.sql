-- Phase 9: UX carte avancée — token move et snap_to_grid
-- Ajoute snap_to_grid aux scènes et un index pour les events token_moved

alter table campaign_scenes
    add column if not exists snap_to_grid boolean not null default true;

create index if not exists scene_tokens_updated_at_idx
    on scene_tokens(updated_at desc);

-- Ajoute colonnes zoom/pan utilisateur pour persistence de l'état de vue
alter table campaign_scenes
    add column if not exists view_zoom real not null default 1.0,
    add column if not exists view_pan_x integer not null default 0,
    add column if not exists view_pan_y integer not null default 0;
