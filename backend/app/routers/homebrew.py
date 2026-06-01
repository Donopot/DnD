import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_user, require_campaign_role
from app.schemas import (
    CreatureToCombatantRequest,
    CreatureToTokenRequest,
    HomebrewCreatureCreateRequest,
    HomebrewCreaturePublic,
    HomebrewCreatureUpdateRequest,
    HomebrewItemCreateRequest,
    HomebrewItemPublic,
    HomebrewItemUpdateRequest,
)

router = APIRouter(prefix="/api", tags=["homebrew"])


def decode_json(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value)
    return value


def creature_public(row) -> HomebrewCreaturePublic:
    data = dict(row)
    for field in ("attributes", "attacks", "spells"):
        data[field] = decode_json(data[field])
    return HomebrewCreaturePublic(**data)


def item_public(row) -> HomebrewItemPublic:
    data = dict(row)
    data["properties"] = decode_json(data["properties"])
    return HomebrewItemPublic(**data)


async def get_creature_or_404(creature_id: UUID):
    row = await get_pool().fetchrow("select * from homebrew_creatures where id = $1", creature_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Creature not found")
    return row


async def get_item_or_404(item_id: UUID):
    row = await get_pool().fetchrow("select * from homebrew_items where id = $1", item_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return row


# --- CREATURES ---

@router.get("/campaigns/{campaign_id}/homebrew/creatures", response_model=list[HomebrewCreaturePublic])
async def list_creatures(campaign_id: UUID, current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    rows = await get_pool().fetch(
        "select * from homebrew_creatures where campaign_id = $1 order by name asc", campaign_id
    )
    return [creature_public(r) for r in rows]


@router.post("/campaigns/{campaign_id}/homebrew/creatures", response_model=HomebrewCreaturePublic, status_code=201)
async def create_creature(campaign_id: UUID, payload: HomebrewCreatureCreateRequest, current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    row = await get_pool().fetchrow(
        """
        insert into homebrew_creatures (campaign_id, name, description, armor_class, hp_max, speed,
            attributes, attacks, spells, size, challenge_rating, type)
        values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12)
        returning *
        """,
        campaign_id, payload.name.strip(), payload.description, payload.armor_class,
        payload.hp_max, payload.speed,
        json.dumps(payload.attributes), json.dumps(payload.attacks), json.dumps(payload.spells),
        payload.size, payload.challenge_rating, payload.type,
    )
    return creature_public(row)


@router.get("/homebrew/creatures/{creature_id}", response_model=HomebrewCreaturePublic)
async def get_creature(creature_id: UUID, current_user=Depends(get_current_user)):
    c = await get_creature_or_404(creature_id)
    await require_campaign_role(c["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})
    return creature_public(c)


@router.patch("/homebrew/creatures/{creature_id}", response_model=HomebrewCreaturePublic)
async def update_creature(creature_id: UUID, payload: HomebrewCreatureUpdateRequest, current_user=Depends(get_current_user)):
    existing = await get_creature_or_404(creature_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})
    cur = dict(existing)
    for k, v in payload.model_dump(exclude_unset=True).items():
        cur[k] = v
    row = await get_pool().fetchrow(
        """
        update homebrew_creatures set name=$2, description=$3, armor_class=$4, hp_max=$5, speed=$6,
            attributes=$7::jsonb, attacks=$8::jsonb, spells=$9::jsonb, size=$10, challenge_rating=$11, type=$12,
            updated_at=now()
        where id=$1 returning *
        """,
        creature_id, cur["name"], cur["description"], cur["armor_class"], cur["hp_max"], cur["speed"],
        json.dumps(cur["attributes"]), json.dumps(cur["attacks"]), json.dumps(cur["spells"]),
        cur["size"], cur["challenge_rating"], cur["type"],
    )
    return creature_public(row)


@router.delete("/homebrew/creatures/{creature_id}", status_code=204)
async def delete_creature(creature_id: UUID, current_user=Depends(get_current_user)):
    existing = await get_creature_or_404(creature_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})
    await get_pool().execute("delete from homebrew_creatures where id = $1", creature_id)


@router.post("/homebrew/creatures/{creature_id}/to-token")
async def creature_to_token(creature_id: UUID, payload: CreatureToTokenRequest, current_user=Depends(get_current_user)):
    c = await get_creature_or_404(creature_id)
    await require_campaign_role(c["campaign_id"], current_user["id"], {"gm", "co_gm"})

    scene = await get_pool().fetchrow("select * from campaign_scenes where id = $1", payload.scene_id)
    if scene is None or scene["campaign_id"] != c["campaign_id"]:
        raise HTTPException(400, "Scene does not belong to this campaign")

    row = await get_pool().fetchrow(
        """
        insert into scene_tokens (scene_id, name, x, y, size, color, is_hidden, metadata)
        values ($1,$2,$3,$4,1,'#ef4444',false,$5::jsonb)
        returning *
        """,
        payload.scene_id, c["name"], payload.x, payload.y,
        json.dumps({"creature_id": str(creature_id), "hp_max": c["hp_max"], "ac": c["armor_class"]}),
    )
    return dict(row)


@router.post("/homebrew/creatures/{creature_id}/to-combatant")
async def creature_to_combatant(creature_id: UUID, payload: CreatureToCombatantRequest, current_user=Depends(get_current_user)):
    c = await get_creature_or_404(creature_id)
    await require_campaign_role(c["campaign_id"], current_user["id"], {"gm", "co_gm"})

    enc = await get_pool().fetchrow("select * from combat_encounters where id = $1", payload.encounter_id)
    if enc is None or enc["campaign_id"] != c["campaign_id"]:
        raise HTTPException(400, "Encounter does not belong to this campaign")

    row = await get_pool().fetchrow(
        """
        insert into combatants (encounter_id, name, initiative, armor_class, hp_current, hp_max, notes, is_hidden)
        values ($1,$2,$3,$4,$5,$6,
            'Imported from homebrew creature ' || $7::text, false)
        returning *
        """,
        payload.encounter_id, c["name"], payload.initiative, c["armor_class"],
        c["hp_max"], c["hp_max"], str(creature_id),
    )
    return dict(row)


# --- ITEMS ---

@router.get("/campaigns/{campaign_id}/homebrew/items", response_model=list[HomebrewItemPublic])
async def list_items(campaign_id: UUID, current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    rows = await get_pool().fetch(
        "select * from homebrew_items where campaign_id = $1 order by name asc", campaign_id
    )
    return [item_public(r) for r in rows]


@router.post("/campaigns/{campaign_id}/homebrew/items", response_model=HomebrewItemPublic, status_code=201)
async def create_item(campaign_id: UUID, payload: HomebrewItemCreateRequest, current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    row = await get_pool().fetchrow(
        """
        insert into homebrew_items (campaign_id, name, description, item_type, rarity, properties)
        values ($1,$2,$3,$4,$5,$6::jsonb)
        returning *
        """,
        campaign_id, payload.name.strip(), payload.description, payload.item_type, payload.rarity,
        json.dumps(payload.properties),
    )
    return item_public(row)


@router.patch("/homebrew/items/{item_id}", response_model=HomebrewItemPublic)
async def update_item(item_id: UUID, payload: HomebrewItemUpdateRequest, current_user=Depends(get_current_user)):
    existing = await get_item_or_404(item_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})
    cur = dict(existing)
    for k, v in payload.model_dump(exclude_unset=True).items():
        cur[k] = v
    row = await get_pool().fetchrow(
        """
        update homebrew_items set name=$2, description=$3, item_type=$4, rarity=$5,
            properties=$6::jsonb, updated_at=now()
        where id=$1 returning *
        """,
        item_id, cur["name"], cur["description"], cur["item_type"], cur["rarity"],
        json.dumps(cur["properties"]),
    )
    return item_public(row)


@router.delete("/homebrew/items/{item_id}", status_code=204)
async def delete_item(item_id: UUID, current_user=Depends(get_current_user)):
    existing = await get_item_or_404(item_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})
    await get_pool().execute("delete from homebrew_items where id = $1", item_id)


# --- EXPORT/IMPORT ---

@router.get("/campaigns/{campaign_id}/homebrew/export")
async def export_homebrew(campaign_id: UUID, current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    creatures = await get_pool().fetch("select * from homebrew_creatures where campaign_id = $1", campaign_id)
    items = await get_pool().fetch("select * from homebrew_items where campaign_id = $1", campaign_id)
    return {
        "creatures": [creature_public(r).model_dump() for r in creatures],
        "items": [item_public(r).model_dump() for r in items],
    }


@router.post("/campaigns/{campaign_id}/homebrew/import", status_code=201)
async def import_homebrew(campaign_id: UUID, payload: dict[str, Any], current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    results = {"creatures": 0, "items": 0}

    for c_data in payload.get("creatures", []):
        await get_pool().execute(
            """
            insert into homebrew_creatures (campaign_id, name, description, armor_class, hp_max, speed,
                attributes, attacks, spells, size, challenge_rating, type)
            values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12)
            """,
            campaign_id, c_data["name"], c_data.get("description", ""),
            c_data.get("armor_class", 10), c_data.get("hp_max", 1), c_data.get("speed", 30),
            json.dumps(c_data.get("attributes", {})), json.dumps(c_data.get("attacks", [])),
            json.dumps(c_data.get("spells", [])),
            c_data.get("size", "medium"), c_data.get("challenge_rating", 0),
            c_data.get("type", "monster"),
        )
        results["creatures"] += 1

    for i_data in payload.get("items", []):
        await get_pool().execute(
            """
            insert into homebrew_items (campaign_id, name, description, item_type, rarity, properties)
            values ($1,$2,$3,$4,$5,$6::jsonb)
            """,
            campaign_id, i_data["name"], i_data.get("description", ""),
            i_data.get("item_type", "misc"), i_data.get("rarity", "common"),
            json.dumps(i_data.get("properties", {})),
        )
        results["items"] += 1

    return results
