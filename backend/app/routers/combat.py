import json
import random
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_pool
from app.deps import get_current_user, require_campaign_role
from app.realtime import manager
from app.schemas import (
    ApplyConditionRequest,
    BulkInitiativeRequest,
    CombatantCreateRequest,
    CombatantPublic,
    CombatantUpdateRequest,
    CombatLogEntryPublic,
    EncounterCreateRequest,
    EncounterDetailPublic,
    EncounterFromSceneRequest,
    EncounterPublic,
    RemoveConditionRequest,
)
from app.utils import decode_json, jsonb

router = APIRouter(prefix="/api", tags=["combat"])


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
        jsonb(payload.conditions),
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
        jsonb(decode_json(current["conditions"])),
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


async def _log_combat_event(
    encounter_id: UUID,
    campaign_id: UUID,
    combatant_id: UUID,
    actor_user_id: UUID,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    await get_pool().execute(
        """
        insert into combat_log (encounter_id, campaign_id, combatant_id, actor_user_id, event_type, payload)
        values ($1, $2, $3, $4, $5, $6::jsonb)
        """,
        encounter_id,
        campaign_id,
        combatant_id,
        actor_user_id,
        event_type,
        jsonb(payload),
    )


@router.post("/encounters/{encounter_id}/conditions/apply", response_model=CombatantPublic)
async def apply_condition(
    encounter_id: UUID,
    payload: ApplyConditionRequest,
    current_user=Depends(get_current_user),
):
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    combatant = await get_combatant_or_404(payload.combatant_id)
    if combatant["encounter_id"] != encounter_id:
        raise HTTPException(status_code=400, detail="Combatant does not belong to this encounter")

    conditions = decode_json(combatant["conditions"])
    condition_names = {c["name"] if isinstance(c, dict) else c for c in conditions}
    if payload.condition.name in condition_names:
        raise HTTPException(status_code=409, detail="Condition already applied to this combatant")

    new_condition = payload.condition.model_dump()
    conditions.append(new_condition)

    row = await get_pool().fetchrow(
        """
        update combatants
        set conditions = $2::jsonb, updated_at = now()
        where id = $1
        returning *
        """,
        payload.combatant_id,
        jsonb(conditions),
    )

    await _log_combat_event(
        encounter_id=encounter_id,
        campaign_id=encounter["campaign_id"],
        combatant_id=payload.combatant_id,
        actor_user_id=current_user["id"],
        event_type="condition_applied",
        payload={"condition": payload.condition.name, "combatant_name": combatant["name"]},
    )

    result = combatant_public(row)
    await broadcast_combat_change(encounter["campaign_id"], encounter_id)
    return result


@router.post("/encounters/{encounter_id}/conditions/remove", response_model=CombatantPublic)
async def remove_condition(
    encounter_id: UUID,
    payload: RemoveConditionRequest,
    current_user=Depends(get_current_user),
):
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    combatant = await get_combatant_or_404(payload.combatant_id)
    if combatant["encounter_id"] != encounter_id:
        raise HTTPException(status_code=400, detail="Combatant does not belong to this encounter")

    conditions = decode_json(combatant["conditions"])
    removed = None
    new_conditions = []
    for c in conditions:
        name = c["name"] if isinstance(c, dict) else c
        if name == payload.condition_name and removed is None:
            removed = c
            continue
        new_conditions.append(c)

    if removed is None:
        raise HTTPException(status_code=404, detail="Condition not found on this combatant")

    row = await get_pool().fetchrow(
        """
        update combatants
        set conditions = $2::jsonb, updated_at = now()
        where id = $1
        returning *
        """,
        payload.combatant_id,
        jsonb(new_conditions),
    )

    await _log_combat_event(
        encounter_id=encounter_id,
        campaign_id=encounter["campaign_id"],
        combatant_id=payload.combatant_id,
        actor_user_id=current_user["id"],
        event_type="condition_removed",
        payload={"condition": payload.condition_name, "combatant_name": combatant["name"]},
    )

    result = combatant_public(row)
    await broadcast_combat_change(encounter["campaign_id"], encounter_id)
    return result


@router.get("/encounters/{encounter_id}/log", response_model=list[CombatLogEntryPublic])
async def get_combat_log(
    encounter_id: UUID,
    current_user=Depends(get_current_user),
) -> list[CombatLogEntryPublic]:
    encounter = await get_encounter_or_404(encounter_id)
    role = await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})

    visibility_clause = "true" if role in {"gm", "co_gm"} else "event_type not in ('damage', 'heal')"

    rows = await get_pool().fetch(
        f"""
        select *
        from combat_log
        where encounter_id = $1
          and ({visibility_clause})
        order by created_at desc
        limit 100
        """,
        encounter_id,
    )

    return [CombatLogEntryPublic(**dict(row)) for row in rows]


@router.post("/scenes/{scene_id}/encounters/from-scene", response_model=EncounterDetailPublic, status_code=status.HTTP_201_CREATED)
async def create_encounter_from_scene(
    scene_id: UUID,
    payload: EncounterFromSceneRequest,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    scene = await get_pool().fetchrow(
        """
        select * from campaign_scenes where id = $1
        """,
        scene_id,
    )
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")

    await require_campaign_role(scene["campaign_id"], current_user["id"], {"gm", "co_gm"})

    tokens = await get_pool().fetch(
        """
        select st.*, ch.attributes as char_attributes
        from scene_tokens st
        left join characters ch on ch.id = st.character_id
        where st.scene_id = $1
        order by st.created_at asc
        """,
        scene_id,
    )

    if not tokens:
        raise HTTPException(status_code=400, detail="Scene has no tokens to create combatants from")

    async with get_pool().acquire() as connection:
        async with connection.transaction():
            encounter = await connection.fetchrow(
                """
                insert into combat_encounters (campaign_id, scene_id, name)
                values ($1, $2, $3)
                returning *
                """,
                scene["campaign_id"],
                scene_id,
                payload.name.strip(),
            )

            for token in tokens:
                await connection.execute(
                    """
                    insert into combatants (
                        encounter_id, token_id, character_id, name,
                        initiative, armor_class, hp_current, hp_max,
                        is_player_controlled, is_hidden
                    )
                    values ($1, $2, $3, $4, 0, 10, 1, 1, false, $5)
                    """,
                    encounter["id"],
                    token["id"],
                    token["character_id"],
                    token["name"],
                    token["is_hidden"],
                )

    combatants = await load_combatants(encounter["id"], include_hidden=True)
    base = encounter_public(encounter, combatants)
    await broadcast_combat_change(scene["campaign_id"], encounter["id"])
    return EncounterDetailPublic(**base.model_dump(), combatants=combatants)


@router.post("/encounters/{encounter_id}/roll-initiative", response_model=EncounterDetailPublic)
async def roll_initiative(
    encounter_id: UUID,
    payload: BulkInitiativeRequest,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    combatants = await load_combatants(encounter_id, include_hidden=True)
    active = [c for c in combatants if not c.is_defeated]

    target_ids: set[UUID] | None = None
    if payload.combatant_ids:
        target_ids = set(payload.combatant_ids)

    for cb in active:
        if target_ids is not None and cb.id not in target_ids:
            continue

        dex_mod = 0
        if cb.character_id:
            char_row = await get_pool().fetchrow(
                "select attributes from characters where id = $1",
                cb.character_id,
            )
            if char_row:
                attrs = decode_json(char_row["attributes"])
                dex_score = attrs.get("dex", 10)
                dex_mod = (dex_score - 10) // 2

        roll = random.randint(1, 20)
        total = roll + dex_mod

        await get_pool().execute(
            "update combatants set initiative = $2, updated_at = now() where id = $1",
            cb.id,
            total,
        )

    row = await get_pool().fetchrow(
        "select * from combat_encounters where id = $1",
        encounter_id,
    )

    combatants = await load_combatants(encounter_id, include_hidden=True)
    base = encounter_public(row, combatants)
    await broadcast_combat_change(encounter["campaign_id"], encounter_id)
    return EncounterDetailPublic(**base.model_dump(), combatants=combatants)


@router.post("/encounters/{encounter_id}/reroll-initiative", response_model=EncounterDetailPublic)
async def reroll_initiative(
    encounter_id: UUID,
    payload: BulkInitiativeRequest,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    """Alias for roll-initiative with same behavior."""
    return await roll_initiative(encounter_id, payload, current_user)


# ── Phase 29: Combat complet — actions rapides, prev turn, reorder ──────────

class QuickDamageRequest(BaseModel):
    combatant_id: UUID
    amount: int
    note: str = Field(default="", max_length=200)


class ReorderRequest(BaseModel):
    combatant_ids: list[UUID]  # new initiative order (first = highest)


@router.post("/encounters/{encounter_id}/prev-turn", response_model=EncounterDetailPublic)
async def prev_turn(
    encounter_id: UUID,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    combatants = await load_combatants(encounter_id, include_hidden=True)
    active = [c for c in combatants if not c.is_defeated]

    if not active:
        raise HTTPException(status_code=400, detail="Encounter has no active combatants")

    prev_index = encounter["turn_index"] - 1
    prev_round = encounter["round_number"]

    if prev_index < 0:
        if prev_round <= 1:
            raise HTTPException(status_code=400, detail="Already at the first turn of round 1")
        prev_index = len(active) - 1
        prev_round -= 1

    row = await get_pool().fetchrow(
        """update combat_encounters
           set turn_index = $2, round_number = $3, status = 'active', updated_at = now()
           where id = $1 returning *""",
        encounter_id, prev_index, prev_round,
    )

    combatants = await load_combatants(encounter_id, include_hidden=True)
    base = encounter_public(row, combatants)
    await broadcast_combat_change(row["campaign_id"], encounter_id)
    return EncounterDetailPublic(**base.model_dump(), combatants=combatants)


@router.post("/combatants/{combatant_id}/quick-damage", response_model=CombatantPublic)
async def quick_damage(
    combatant_id: UUID,
    payload: QuickDamageRequest,
    current_user=Depends(get_current_user),
) -> CombatantPublic:
    existing = await get_combatant_or_404(combatant_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})

    new_hp = max(0, min(existing["hp_max"], existing["hp_current"] + payload.amount))
    is_defeated = new_hp <= 0

    row = await get_pool().fetchrow(
        """update combatants
           set hp_current = $2, is_defeated = $3, updated_at = now()
           where id = $1 returning *""",
        combatant_id, new_hp, is_defeated,
    )

    verb = "heal" if payload.amount > 0 else "damage"
    await _log_combat_event(
        encounter_id=existing["encounter_id"],
        campaign_id=existing["campaign_id"],
        combatant_id=combatant_id,
        actor_user_id=current_user["id"],
        event_type=verb,
        payload={
            "amount": abs(payload.amount),
            "new_hp": new_hp,
            "hp_max": existing["hp_max"],
            "note": payload.note,
            "combatant_name": existing["name"],
        },
    )

    result = combatant_public(row)
    await broadcast_combat_change(existing["campaign_id"], existing["encounter_id"])
    return result


@router.post("/encounters/{encounter_id}/reorder", response_model=EncounterDetailPublic)
async def reorder_initiative(
    encounter_id: UUID,
    payload: ReorderRequest,
    current_user=Depends(get_current_user),
) -> EncounterDetailPublic:
    encounter = await get_encounter_or_404(encounter_id)
    await require_campaign_role(encounter["campaign_id"], current_user["id"], {"gm", "co_gm"})

    # Assign descending initiative values based on position
    base = 1000
    for idx, cb_id in enumerate(payload.combatant_ids):
        await get_pool().execute(
            "update combatants set initiative = $2, updated_at = now() where id = $1 and encounter_id = $3",
            cb_id, base - idx, encounter_id,
        )

    row = await get_pool().fetchrow("select * from combat_encounters where id = $1", encounter_id)
    combatants = await load_combatants(encounter_id, include_hidden=True)
    base_enc = encounter_public(row, combatants)
    await broadcast_combat_change(encounter["campaign_id"], encounter_id)
    return EncounterDetailPublic(**base_enc.model_dump(), combatants=combatants)
