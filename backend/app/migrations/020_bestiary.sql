-- Migration 020: Bestiary — SRD monster manual
create table if not exists bestiary (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    type        text not null,         -- aberration, beast, celestial, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, undead
    size        text not null,         -- tiny, small, medium, large, huge, gargantuan
    alignment   text not null default 'unaligned',
    cr          real not null,         -- challenge rating (0, 0.125, 0.25, 0.5, 1, 2, ...)
    xp          integer not null,
    ac          integer not null,
    ac_type     text,                  -- natural armor, chain mail, etc.
    hp          text not null,         -- e.g. "52 (8d8+16)"
    hp_avg      integer not null,
    speed       text not null,         -- e.g. "30 ft., fly 60 ft."
    str         integer not null,
    dex         integer not null,
    con         integer not null,
    int         integer not null,
    wis         integer not null,
    cha         integer not null,
    skills      text,                  -- e.g. "Perception +5, Stealth +7"
    saves       text,                  -- e.g. "Dex +5, Con +4"
    damage_resistances  text,
    damage_immunities   text,
    condition_immunities text,
    senses      text not null default 'passive Perception 10',
    languages   text not null default '—',
    traits      jsonb not null default '[]'::jsonb,       -- [{name, desc}]
    actions     jsonb not null default '[]'::jsonb,       -- [{name, desc}]
    legendary_actions jsonb not null default '[]'::jsonb, -- [{name, desc}]
    environment text[],               -- arctic, coastal, desert, forest, grassland, mountain, swamp, underdark, urban
    source      text not null default 'SRD 5.1',
    created_at  timestamptz not null default now()
);

create index if not exists bestiary_cr_idx on bestiary(cr);
create index if not exists bestiary_type_idx on bestiary(type);
create index if not exists bestiary_environment_idx on bestiary using gin(environment);
create index if not exists bestiary_name_trgm on bestiary using gin(name gin_trgm_ops);
