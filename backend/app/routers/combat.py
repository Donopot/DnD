import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_user, require_campaign_role
from app.realtime import manager
from app.schemas import (
    CombatantCreateRequest,
    CombatantPublic,
    CombatantUpdateRequest,
    EncounterCreateRequest,
    EncounterDetailPublic,
    EncounterPublic,
)

router = APIRouter(prefix="/api", tags=["combat"])


def decode_json(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value)
    return value


def combatant_public(row) -> CombatantPublic:
    data = dict(row)
    data["conditions"] = decode_json(data["conditions"])
    return CombatantPublic(**data)


def ordered_combatants(rows) -> list[CombatantPublic]:
    return [combatant_public(row) for row in rows]


def active_combatant_id(combatants: list[CombatantPublic], turn_index: int) -> UUID | None:
    active = [combatant for combatant in combatants if not combatant.is_defeated]
    if not active:
        return None
    return active[turn_index % len(active)].id


def encounter_public(row, combatants: list[CombatantPublic] | None = None) -> EncounterPublic:
    active_id = None
    if combatants is not None:
        active_id = active_combatant_id(combatants, row["turn_index"])

    return EncounterPublic(
        id=row["id"],
        campaign_id=row["campaign_id"],
        scene_id=row["scene_id"],
        name=row["name"],
        status=row["status"],
        round_number=row["round_number"],
        turn_index=row["turn_index"],
        active_combatant_id=active_id,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


async def broadcast_combat_change(campaign_id: UUID, encounter_id: UUID) -> None:
    await manager.broadcast(
        campaign_id,
        {
            "type": "session_changed",
            "resource": "encounter",
            "campaign_id": str(campaign_id),
            "encounter_id": str(encounter_id),
        },
    )


async def get_encounter_or_404(encounter_id: UUID):
    row = await get_pool().fetchrow(
        """
        select *
        from combat_encounters
        where id = $1
        """,
        encounter_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return row


async def get_combatant_or_404(combatant_id: UUID):
    row = await get_pool().fetchrow(
        """
        select
            cb.*,
            ce.campaign_id
        from combatants cb
        join combat_encounters ce on ce.id = cb.encounter_id
        where cb.id = $1
        """,
        combatant_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Combatant not found")
    return row


async def validate_scene(campaign_id: UUID, scene_id: UUID | None) -> None:
    if scene_id is None:
        return

    exists = await get_pool().fetchval(
        """
        select exists (
            select 1
            from campaign_scenes
            where id = $1 and campaign_id = $2
        )
        """,
        scene_id,
        campaign_id,
    )
    if not exists:
        raise HTTPException(status_code=400, detail="Scene does not belong to this campaign")


async def validate_token(campaign_id: UUID, token_id: UUID | None) -> None:
    if token_id is None:
        return

    exists = await get_pool().fetchval(
        """
        select exists (
            select 1
            from scene_tokens st
            join campaign_scenes cs on cs.id = st.scene_id
            where st.id = $1 and cs.campaign_id = $2
        )
        """,
        token_id,
        campaign_id,
    )
    if not exists:
        raise HTTPException(status_code=400, detail="Token does not belong to this campaign")


async def validate_character(campaign_id: UUID, character_id: UUID | None) -> None:
    if character_id is None:
        return

    exists = await get_pool().fetchval(
        """
        select exists (
            select 1
            from characters
            where id = $1 and campaign_id = $2
        )
        """,
        character_id,
        campaign_id,
    )
    if not exists:
        raise HTTPException(status_code=400, detail="Character does not belong to this campaign")


async def load_combatants(encounter_id: UUID, include_hidden: bool) -> list[CombatantPublic]:
    hidden_clause = "" if include_hidden else "and is_hidden = false"

    rows = await get_pool().fetch(
        f"""
        select *
        from combatants
        where encounter_id = $1 {hidden_clause}
        order by initiative desc, created_at asc
        """,
        encounter_id,
    )
    return ordered_combatants(rows)


@router.get("/campaigns/{campaign_id}/encounters", response_model=list[EncounterPublic])
async def list_encounters(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> list[EncounterPublic]:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})

    rows = await get_pool().fetch(
        """
        select *
        from combat_encounters
        where campaign_id = $1
        order by
            case status when 'active' then 1 when 'draft' then 2 else 3 end,
            updated_at desc
        """,
        campaign_id,
    )
    return [encounter_public(row) for row in rows]


@router.post("/campaigns/{campaign_id}/encounters", response_model=EncounterPublic, status_code=status.HTTP_201_CREATED)
async def create_encounter(
    campaign_id: UUID,
    payload: EncounterCreateRequest,
    current_user=Depends(get_current_user),
) -> EncounterPublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    await validate_scene(campaign_id, payload.scene_id)

    row = await get_pool().fetchrow(
        """
        insert into combat_encounters (campaign_id, scene_id, name)
        values ($1, $2, $3)
        returning *
        """,
        campaign_id,
        payload.scene_id,
        payload.name.strip(),
    )

    encounter = encounter_public(row)
    await broadcast_combat_change(campaign_id, encounter.id)
    return encounter


@router.get("/encounters/{encounter_id}", response_model=EncounterDetailPublic)
async def get_encounter(
    encounter_id: UUID,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    row = await get_encounter_or_404(encounter_id)
    role = await require_campaign_role(row["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})
    combatants = await load_combatants(encounter_id, include_hidden=role in {"gm", "co_gm"})
    base = encounter_public(row, combatants)
    return EncounterDetailPublic(**base.model_dump(), combatants=combatants)


@router.post("/encounters/{encounter_id}/combatants", response_model=CombatantPublic, status_code=status.HTTP_201_CREATED)
async def create_combatant(
    encounter_id: UUID,
    payload: CombatantCreateRequest,
    current_user=Depends(get_current_user),
) -> CombatantPublic:
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    await validate_token(encounter["campaign_id"], payload.token_id)
    await validate_character(encounter["campaign_id"], payload.character_id)

    row = await get_pool().fetchrow(
        """
        insert into combatants (
            encounter_id,
            token_id,
            character_id,
            name,
            initiative,
            armor_class,
            hp_current,
            hp_max,
            conditions,
            notes,
            is_player_controlled,
            is_hidden
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)
        returning *
        """,
        encounter_id,
        payload.token_id,
        payload.character_id,
        payload.name.strip(),
        payload.initiative,
        payload.armor_class,
        payload.hp_current,
        payload.hp_max,
        json.dumps(payload.conditions),
        payload.notes.strip(),
        payload.is_player_controlled,
        payload.is_hidden,
    )

    combatant = combatant_public(row)
    await broadcast_combat_change(encounter["campaign_id"], encounter_id)
    return combatant


@router.patch("/combatants/{combatant_id}", response_model=CombatantPublic)
async def update_combatant(
    combatant_id: UUID,
    payload: CombatantUpdateRequest,
    current_user=Depends(get_current_user),
) -> CombatantPublic:
    existing = await get_combatant_or_404(combatant_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})

    current = dict(existing)
    updates = payload.model_dump(exclude_unset=True)

    for key, value in updates.items():
        current[key] = value.strip() if isinstance(value, str) else value

    await validate_token(existing["campaign_id"], current["token_id"])
    await validate_character(existing["campaign_id"], current["character_id"])

    row = await get_pool().fetchrow(
        """
        update combatants
        set
            token_id = $2,
            character_id = $3,
            name = $4,
            initiative = $5,
            armor_class = $6,
            hp_current = $7,
            hp_max = $8,
            conditions = $9::jsonb,
            notes = $10,
            is_player_controlled = $11,
            is_hidden = $12,
            is_defeated = $13,
            updated_at = now()
        where id = $1
        returning *
        """,
        combatant_id,
        current["token_id"],
        current["character_id"],
        current["name"],
        current["initiative"],
        current["armor_class"],
        current["hp_current"],
        current["hp_max"],
        json.dumps(decode_json(current["conditions"])),
        current["notes"],
        current["is_player_controlled"],
        current["is_hidden"],
        current["is_defeated"],
    )

    combatant = combatant_public(row)
    await broadcast_combat_change(existing["campaign_id"], existing["encounter_id"])
    return combatant


@router.post("/encounters/{encounter_id}/start", response_model=EncounterDetailPublic)
async def start_encounter(
    encounter_id: UUID,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    combatants = await load_combatants(encounter_id, include_hidden=True)
    if not combatants:
        raise HTTPException(status_code=400, detail="Encounter needs at least one combatant")

    row = await get_pool().fetchrow(
        """
        update combat_encounters
        set status = 'active', round_number = 1, turn_index = 0, updated_at = now()
        where id = $1
        returning *
        """,
        encounter_id,
    )

    combatants = await load_combatants(encounter_id, include_hidden=True)
    base = encounter_public(row, combatants)
    await broadcast_combat_change(row["campaign_id"], encounter_id)
    return EncounterDetailPublic(**base.model_dump(), combatants=combatants)


@router.post("/encounters/{encounter_id}/next-turn", response_model=EncounterDetailPublic)
async def next_turn(
    encounter_id: UUID,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    combatants = await load_combatants(encounter_id, include_hidden=True)
    active = [combatant for combatant in combatants if not combatant.is_defeated]

    if not active:
        raise HTTPException(status_code=400, detail="Encounter has no active combatants")

    next_index = encounter["turn_index"] + 1
    next_round = encounter["round_number"]

    if next_index >= len(active):
        next_index = 0
        next_round += 1

    row = await get_pool().fetchrow(
        """
        update combat_encounters
        set turn_index = $2, round_number = $3, status = 'active', updated_at = now()
        where id = $1
        returning *
        """,
        encounter_id,
        next_index,
        next_round,
    )

    combatants = await load_combatants(encounter_id, include_hidden=True)
    base = encounter_public(row, combatants)
    await broadcast_combat_change(row["campaign_id"], encounter_id)
    return EncounterDetailPublic(**base.model_dump(), combatants=combatants)


@router.post("/encounters/{encounter_id}/end", response_model=EncounterDetailPublic)
async def end_encounter(
    encounter_id: UUID,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    row = await get_pool().fetchrow(
        """
        update combat_encounters
        set status = 'ended', updated_at = now()
        where id = $1
        returning *
        """,
        encounter_id,
    )

    combatants = await load_combatants(encounter_id, include_hidden=True)
    base = encounter_public(row, combatants)
    await broadcast_combat_change(row["campaign_id"], encounter_id)
    return EncounterDetailPublic(**base.model_dump(), combatants=combatants)
