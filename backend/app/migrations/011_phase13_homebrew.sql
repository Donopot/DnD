-- Phase 13: BibliothÃ¨que homebrew - creatures et items rÃ©utilisables

create table if not exists homebrew_creatures (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    description text not null default '',
    armor_class int not null default 10,
    hp_max int not null default 1,
    speed int not null default 30,
    attributes jsonb not null default '{}',
    attacks jsonb not null default '[]',
    spells jsonb not null default '[]',
    size text not null default 'medium'
        check (size in ('tiny','small','medium','large','huge','gargantuan')),
    challenge_rating real not null default 0,
    type text not null default 'monster'
        check (type in ('monster','npc','beast','humanoid','dragon','undead','fiend','elemental','aberration','celestial','construct','fey','giant','ooze','plant')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists hb_creatures_campaign_idx on homebrew_creatures(campaign_id);
create index if not exists hb_creatures_type_idx on homebrew_creatures(type);

create table if not exists homebrew_items (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references campaigns(id) on delete cascade,
    name text not null,
    description text not null default '',
    item_type text not null default 'misc',
    rarity text not null default 'common'
        check (rarity in ('common','uncommon','rare','very_rare','legendary')),
    properties jsonb not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists hb_items_campaign_idx on homebrew_items(campaign_id);
create index if not exists hb_items_rarity_idx on homebrew_items(rarity);
