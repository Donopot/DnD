-- 029_normalize_gm_settings.sql
-- Merges DEFAULT_GM_SETTINGS into every existing campaign so the
-- frontend no longer has to guess missing keys.
--
-- DEFAULT_GM_SETTINGS = {
--   allow_player_token_move: true,
--   show_player_hp: true,
--   fog_enabled: true,
--   player_fog_reveal: true,
--   show_initiative_to_players: true,
--   allow_player_map_pan: true,
-- }
--
-- The backend always merges defaults now (campaign_public helper),
-- so this migration is a belt-and-suspenders normalisation.
-- Existing overridden values are preserved.

update campaigns
set gm_settings = (
    select jsonb_strip_nulls(
        jsonb_build_object(
            'allow_player_token_move', true,
            'show_player_hp', true,
            'fog_enabled', true,
            'player_fog_reveal', true,
            'show_initiative_to_players', true,
            'allow_player_map_pan', true
        ) || coalesce(gm_settings, '{}'::jsonb)
    )
)
where gm_settings is null
   or not (gm_settings ? 'allow_player_token_move');
