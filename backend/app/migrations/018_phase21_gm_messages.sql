-- 018_phase21_gm_messages.sql
-- Messages privés GM→joueur + Annonces globales
-- Phase 21: Communication MJ↔Joueur

-- Messages privés (GM→joueur ou joueur→GM)
create table if not exists gm_messages (
    id          uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    sender_id   uuid not null references users(id),
    recipient_id uuid references users(id),       -- null = broadcast/announcement
    content     text not null,
    kind        text not null default 'message',   -- 'message' | 'announcement' | 'secret_roll'
    roll_data   jsonb,                             -- {formula, total, detail} for secret_roll
    read_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index idx_gm_messages_campaign on gm_messages(campaign_id);
create index idx_gm_messages_recipient on gm_messages(recipient_id);
create index idx_gm_messages_kind on gm_messages(kind);
