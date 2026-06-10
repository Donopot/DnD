-- 026_scene_visibility.sql
-- Ajoute is_secret pour masquer les scènes non prêtes aux joueurs.

alter table campaign_scenes
    add column if not exists is_secret boolean not null default false;

-- Index pour filtrer rapidement les scènes visibles côté joueur
create index if not exists campaign_scenes_player_idx
    on campaign_scenes(campaign_id) where is_secret = false;
