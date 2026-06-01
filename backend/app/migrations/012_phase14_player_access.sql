-- Phase 14: Accès joueur sécurisé et audit

create table if not exists permission_audit (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    resource_type text not null,
    resource_id uuid,
    action text not null,
    granted boolean not null,
    role text not null,
    created_at timestamptz not null default now()
);

create index if not exists perm_audit_campaign_idx on permission_audit(campaign_id);
create index if not exists perm_audit_user_idx on permission_audit(user_id, created_at desc);
