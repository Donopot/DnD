-- Migration 022: Item compendium — magic items + equipment
create table if not exists items (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    category    text not null,        -- weapon, armor, potion, scroll, ring, rod, staff, wand, wondrous, gear, tool, mount
    rarity      text not null default 'common',  -- common, uncommon, rare, very_rare, legendary, artifact
    attunement  boolean not null default false,
    cost        text,                 -- "50 gp", "500-5000 gp"
    weight      text,                 -- "2 lb.", "—"
    description text not null,
    properties  jsonb not null default '[]'::jsonb,  -- weapon properties: [finesse, heavy, light, ...]
    damage      text,                 -- weapon damage: "1d8 slashing"
    ac          integer,              -- armor AC
    armor_type  text,                 -- light, medium, heavy, shield
    source      text not null default 'SRD 5.1',
    created_at  timestamptz not null default now()
);

create index if not exists items_category_idx on items(category);
create index if not exists items_rarity_idx on items(rarity);
create index if not exists items_name_trgm on items using gin(name gin_trgm_ops);
