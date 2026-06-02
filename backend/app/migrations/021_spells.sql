-- Migration 021: Spellbook — SRD spells
create table if not exists spells (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    level           integer not null check (level between 0 and 9),
    school          text not null,       -- abjuration, conjuration, divination, enchantment, evocation, illusion, necromancy, transmutation
    casting_time    text not null,       -- "1 action", "1 bonus action", "1 reaction", "10 minutes", etc.
    range           text not null,       -- "Self", "Touch", "60 feet", "120 feet", etc.
    components      text not null,       -- "V, S, M (a diamond worth 300 gp)"
    duration        text not null,       -- "Instantaneous", "1 minute", "Concentration, up to 1 hour", etc.
    description     text not null,
    higher_level    text,                -- "When you cast this spell using a spell slot of X level..."
    classes         text[] not null,     -- {wizard, cleric, druid, bard, paladin, ranger, sorcerer, warlock}
    ritual          boolean not null default false,
    concentration   boolean not null default false,
    source          text not null default 'SRD 5.1',
    created_at      timestamptz not null default now()
);

create index if not exists spells_level_idx on spells(level);
create index if not exists spells_school_idx on spells(school);
create index if not exists spells_name_trgm on spells using gin(name gin_trgm_ops);
