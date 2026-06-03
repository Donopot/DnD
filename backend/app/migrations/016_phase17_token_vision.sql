-- 016_phase17_token_vision.sql
-- Phase 17: Token vision radius for auto fog reveal

alter table scene_tokens
    add column if not exists vision_radius integer not null default 0;

comment on column scene_tokens.vision_radius is
'Vision radius in feet for auto fog reveal (0 = disabled). Player-character tokens use this to auto-reveal fog around them when moved.';
