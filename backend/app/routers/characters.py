import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_user, require_campaign_role
from app.schemas import CharacterCreateRequest, CharacterPublic, CharacterUpdateRequest
from app.utils import decode_json, jsonb

router = APIRouter(prefix="/api", tags=["characters"])

JSON_FIELDS = {
    "attributes",
    "skills",
    "saving_throws",
    "attacks",
    "inventory",
    "spells",
    "resources",
}


def character_public(row) -> CharacterPublic:
    data = dict(row)
    for field in JSON_FIELDS:
        data[field] = decode_json(data[field])
    return CharacterPublic(**data)


async def get_character_or_404(character_id: UUID):
    row = await get_pool().fetchrow(
        """
        select *
        from characters
        where id = $1
        """,
        character_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return row


async def ensure_owner_is_campaign_member(campaign_id: UUID, owner_user_id: UUID | None) -> None:
    if owner_user_id is None:
        return
    exists = await get_pool().fetchval(
        """
        select exists (
            select 1
            from campaign_members
            where campaign_id = $1 and user_id = $2
        )
        """,
        campaign_id,
        owner_user_id,
    )
    if not exists:
        raise HTTPException(status_code=400, detail="Character owner must be a campaign member")


@router.get("/campaigns/{campaign_id}/characters", response_model=list[CharacterPublic])
async def list_characters(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> list[CharacterPublic]:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    rows = await get_pool().fetch(
        """
        select *
        from characters
        where campaign_id = $1
        order by created_at asc
        """,
        campaign_id,
    )
    return [character_public(row) for row in rows]


@router.post("/campaigns/{campaign_id}/characters", response_model=CharacterPublic, status_code=201)
async def create_character(
    campaign_id: UUID,
    payload: CharacterCreateRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    role = await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    owner_user_id = payload.owner_user_id or current_user["id"]
    if role == "player" and owner_user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Players can only create their own characters")
    await ensure_owner_is_campaign_member(campaign_id, owner_user_id)

    row = await get_pool().fetchrow(
        """
        insert into characters (
            campaign_id,
            owner_user_id,
            name,
            ancestry,
            class_name,
            level,
            armor_class,
            speed,
            proficiency_bonus,
            hp_current,
            hp_max,
            attributes,
            skills,
            saving_throws,
            attacks,
            inventory,
            spells,
            resources,
            notes
        )
        values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb,
            $16::jsonb, $17::jsonb, $18::jsonb, $19
        )
        returning *
        """,
        campaign_id,
        owner_user_id,
        payload.name.strip(),
        payload.ancestry.strip(),
        payload.class_name.strip(),
        payload.level,
        payload.armor_class,
        payload.speed,
        payload.proficiency_bonus,
        payload.hp_current,
        payload.hp_max,
        json.dumps(payload.attributes),
        json.dumps(payload.skills),
        json.dumps(payload.saving_throws),
        json.dumps(payload.attacks),
        json.dumps(payload.inventory),
        json.dumps(payload.spells),
        json.dumps(payload.resources),
        payload.notes.strip(),
    )
    return character_public(row)


@router.get("/characters/{character_id}", response_model=CharacterPublic)
async def get_character(
    character_id: UUID,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    row = await get_character_or_404(character_id)
    await require_campaign_role(row["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})
    return character_public(row)


@router.patch("/characters/{character_id}", response_model=CharacterPublic)
async def update_character(
    character_id: UUID,
    payload: CharacterUpdateRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    existing = await get_character_or_404(character_id)
    role = await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})
    if role == "player" and existing["owner_user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Players can only edit their own characters")

    current = dict(existing)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        current[key] = value.strip() if isinstance(value, str) else value

    row = await get_pool().fetchrow(
        """
        update characters
        set
            name = $2,
            ancestry = $3,
            class_name = $4,
            level = $5,
            armor_class = $6,
            speed = $7,
            proficiency_bonus = $8,
            hp_current = $9,
            hp_max = $10,
            attributes = $11::jsonb,
            skills = $12::jsonb,
            saving_throws = $13::jsonb,
            attacks = $14::jsonb,
            inventory = $15::jsonb,
            spells = $16::jsonb,
            resources = $17::jsonb,
            notes = $18,
            updated_at = now()
        where id = $1
        returning *
        """,
        character_id,
        current["name"],
        current["ancestry"],
        current["class_name"],
        current["level"],
        current["armor_class"],
        current["speed"],
        current["proficiency_bonus"],
        current["hp_current"],
        current["hp_max"],
        json.dumps(decode_json(current["attributes"])),
        json.dumps(decode_json(current["skills"])),
        json.dumps(decode_json(current["saving_throws"])),
        json.dumps(decode_json(current["attacks"])),
        json.dumps(decode_json(current["inventory"])),
        json.dumps(decode_json(current["spells"])),
        json.dumps(decode_json(current["resources"])),
        current["notes"],
    )
    return character_public(row)


@router.delete("/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: UUID,
    current_user=Depends(get_current_user),
) -> None:
    existing = await get_character_or_404(character_id)
    role = await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})
    if role == "player" and existing["owner_user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Players can only delete their own characters")

    await get_pool().execute("delete from characters where id = $1", character_id)

