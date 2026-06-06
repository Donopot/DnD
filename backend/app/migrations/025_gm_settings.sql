-- 025_gm_settings.sql
-- Ajoute une colonne jsonb gm_settings aux campagnes pour les préférences MJ.

alter table campaigns
    add column if not exists gm_settings jsonb not null default '{}'::jsonb;
