-- 024_phase18_token_zindex.sql
-- Phase 18: Token z-index for layer ordering (bring forward / send backward)

alter table scene_tokens
    add column if not exists z_index integer not null default 0;

create index if not exists scene_tokens_z_index_idx
    on scene_tokens(scene_id, z_index);
