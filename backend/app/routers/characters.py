import json
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from app.db import get_pool
from app.deps import get_current_user
from app.deps import require_campaign_role
from app.schemas import CharacterApproveRequest
from app.schemas import CharacterCreateRequest
from app.schemas import CharacterPublic
from app.schemas import CharacterSubmitRequest
from app.schemas import CharacterUpdateRequest
from app.schemas import ConditionsUpdateRequest
from app.schemas import HpAdjustRequest
from app.schemas import InventoryItemRequest
from app.schemas import ResourceRequest
from app.schemas import XpUpdateRequest
from app.utils import decode_json

router = APIRouter(prefix="/api", tags=["characters"])

JSON_FIELDS = {
    "attributes",
    "skills",
    "saving_throws",
    "attacks",
    "inventory",
    "spells",
    "resources",
    "conditions",
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


@router.get("/characters/{character_id:uuid}", response_model=CharacterPublic)
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
    if current["hp_current"] > current["hp_max"]:
        raise HTTPException(status_code=422, detail="Current HP cannot exceed maximum HP")

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


# ── Personal vault ──────────────────────────────────────────────────────


@router.get("/characters/mine", response_model=list[CharacterPublic])
async def list_my_characters(current_user=Depends(get_current_user)) -> list[CharacterPublic]:
    """Liste les personnages du vault personnel (hors campagne)."""
    rows = await get_pool().fetch(
        """
        select *
        from characters
        where owner_user_id = $1 and campaign_id is null
        order by created_at desc
        """,
        current_user["id"],
    )
    return [character_public(row) for row in rows]


@router.post("/characters", response_model=CharacterPublic, status_code=201)
async def create_personal_character(
    payload: CharacterCreateRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Crée un personnage dans le vault personnel (campaign_id = NULL)."""
    owner_user_id = payload.owner_user_id or current_user["id"]

    row = await get_pool().fetchrow(
        """
        insert into characters (
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
            notes,
            status
        )
        values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb,
            $15::jsonb, $16::jsonb, $17::jsonb, $18,
            'personal'
        )
        returning *
        """,
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


# ── Submission flow ─────────────────────────────────────────────────────


@router.post("/characters/{character_id}/submit", response_model=CharacterPublic)
async def submit_character(
    character_id: UUID,
    payload: CharacterSubmitRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Soumet un personnage du vault à une campagne pour approbation du MJ."""
    existing = await get_character_or_404(character_id)

    if existing["owner_user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez soumettre que vos propres personnages")
    if existing["status"] != "personal":
        raise HTTPException(status_code=400, detail="Seuls les personnages du vault peuvent être soumis")
    if existing["campaign_id"] is not None:
        raise HTTPException(status_code=400, detail="Ce personnage est déjà dans une campagne")

    # Vérifier que l'utilisateur est membre de la campagne cible
    await require_campaign_role(payload.campaign_id, current_user["id"], {"gm", "co_gm", "player"})

    row = await get_pool().fetchrow(
        """
        update characters
        set status = 'submitted',
            submitted_to_campaign_id = $2,
            updated_at = now()
        where id = $1
        returning *
        """,
        character_id,
        payload.campaign_id,
    )
    return character_public(row)


@router.get("/campaigns/{campaign_id}/submissions", response_model=list[CharacterPublic])
async def list_submissions(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> list[CharacterPublic]:
    """Liste les soumissions en attente pour une campagne (GM/co_GM uniquement)."""
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    rows = await get_pool().fetch(
        """
        select *
        from characters
        where submitted_to_campaign_id = $1 and status = 'submitted'
        order by created_at asc
        """,
        campaign_id,
    )
    return [character_public(row) for row in rows]


@router.patch("/characters/{character_id}/approve", response_model=CharacterPublic)
async def approve_character(
    character_id: UUID,
    payload: CharacterApproveRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Approuve ou refuse une soumission de personnage (GM/co_GM uniquement)."""
    existing = await get_character_or_404(character_id)

    if existing["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Ce personnage n'est pas en attente d'approbation")
    if existing["submitted_to_campaign_id"] is None:
        raise HTTPException(status_code=400, detail="Aucune campagne cible pour cette soumission")

    await require_campaign_role(
        existing["submitted_to_campaign_id"],
        current_user["id"],
        {"gm", "co_gm"},
    )

    if payload.approved:
        row = await get_pool().fetchrow(
            """
            update characters
            set campaign_id = submitted_to_campaign_id,
                status = 'active',
                submitted_to_campaign_id = null,
                updated_at = now()
            where id = $1
            returning *
            """,
            character_id,
        )
    else:
        row = await get_pool().fetchrow(
            """
            update characters
            set status = 'personal',
                submitted_to_campaign_id = null,
                updated_at = now()
            where id = $1
            returning *
            """,
            character_id,
        )

    return character_public(row)


# ── Phase 23: Character Management (GM only) ────────────────────────────────

@router.patch("/characters/{character_id}/xp", response_model=CharacterPublic)
async def update_character_xp(
    character_id: UUID,
    payload: XpUpdateRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Add XP to a character. GM only."""
    char = await get_character_or_404(character_id)
    campaign_id = char["campaign_id"]
    if not campaign_id:
        raise HTTPException(status_code=400, detail="Character is not in a campaign")
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    new_xp = char["xp"] + payload.amount
    row = await get_pool().fetchrow(
        "update characters set xp = $1, updated_at = now() where id = $2 returning *",
        new_xp,
        character_id,
    )

    note = payload.note or f"+{payload.amount} XP"
    await get_pool().execute(
        """insert into game_log_entries (campaign_id, user_id, entry_type, visibility, message, payload)
           values ($1, $2, 'note', 'gm', $3, '{}'::jsonb)""",
        campaign_id,
        current_user["id"],
        f"{char['name']} : {note} (total: {new_xp} XP)",
    )

    return character_public(row)


@router.patch("/characters/{character_id}/conditions", response_model=CharacterPublic)
async def update_character_conditions(
    character_id: UUID,
    payload: ConditionsUpdateRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Set active conditions on a character. GM only."""
    char = await get_character_or_404(character_id)
    campaign_id = char["campaign_id"]
    if not campaign_id:
        raise HTTPException(status_code=400, detail="Character is not in a campaign")
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    conditions_json = json.dumps(payload.conditions)
    row = await get_pool().fetchrow(
        "update characters set conditions = $1::jsonb, updated_at = now() where id = $2 returning *",
        conditions_json,
        character_id,
    )

    cond_names = [c.get("name", "?") for c in payload.conditions]
    await get_pool().execute(
        """insert into game_log_entries (campaign_id, user_id, entry_type, visibility, message, payload)
           values ($1, $2, 'note', 'gm', $3, '{}'::jsonb)""",
        campaign_id,
        current_user["id"],
        f"{char['name']} : conditions -> {', '.join(cond_names) if cond_names else 'aucune'}",
    )

    return character_public(row)


@router.patch("/characters/{character_id}/hp", response_model=CharacterPublic)
async def adjust_character_hp(
    character_id: UUID,
    payload: HpAdjustRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Heal or damage a character. GM only."""
    char = await get_character_or_404(character_id)
    campaign_id = char["campaign_id"]
    if not campaign_id:
        raise HTTPException(status_code=400, detail="Character is not in a campaign")
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    new_hp = max(0, min(char["hp_max"], char["hp_current"] + payload.amount))
    row = await get_pool().fetchrow(
        "update characters set hp_current = $1, updated_at = now() where id = $2 returning *",
        new_hp,
        character_id,
    )

    verb = "soigne" if payload.amount > 0 else "subit"
    note = payload.note or f"{verb} {abs(payload.amount)} PV"
    await get_pool().execute(
        """insert into game_log_entries (campaign_id, user_id, entry_type, visibility, message, payload)
           values ($1, $2, 'note', 'gm', $3, '{}'::jsonb)""",
        campaign_id,
        current_user["id"],
        f"{char['name']} {note} (PV: {new_hp}/{char['hp_max']})",
    )

    return character_public(row)


@router.patch("/characters/{character_id}/inventory", response_model=CharacterPublic)
async def manage_character_inventory(
    character_id: UUID,
    payload: InventoryItemRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Add, remove, or update an inventory item. GM only."""
    char = await get_character_or_404(character_id)
    campaign_id = char["campaign_id"]
    if not campaign_id:
        raise HTTPException(status_code=400, detail="Character is not in a campaign")
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    inventory = decode_json(char["inventory"]) if isinstance(char["inventory"], str) else char["inventory"]
    if not isinstance(inventory, list):
        inventory = []

    action = payload.action
    if action == "add":
        inventory.append(payload.item)
        log_msg = f"{char['name']} recoit {payload.item.get('name', 'objet')}"
    elif action == "remove":
        if payload.index is None or payload.index < 0 or payload.index >= len(inventory):
            raise HTTPException(status_code=422, detail="Invalid index for remove action")
        removed = inventory.pop(payload.index)
        log_msg = f"{char['name']} perd {removed.get('name', 'objet')}"
    elif action == "update":
        if payload.index is None or payload.index < 0 or payload.index >= len(inventory):
            raise HTTPException(status_code=422, detail="Invalid index for update action")
        inventory[payload.index] = payload.item
        log_msg = f"{char['name']} : {payload.item.get('name', 'objet')} mis a jour"

    row = await get_pool().fetchrow(
        "update characters set inventory = $1::jsonb, updated_at = now() where id = $2 returning *",
        json.dumps(inventory),
        character_id,
    )

    await get_pool().execute(
        """insert into game_log_entries (campaign_id, user_id, entry_type, visibility, message, payload)
           values ($1, $2, 'note', 'gm', $3, '{}'::jsonb)""",
        campaign_id,
        current_user["id"],
        log_msg,
    )

    return character_public(row)


@router.patch("/characters/{character_id}/resources", response_model=CharacterPublic)
async def manage_character_resources(
    character_id: UUID,
    payload: ResourceRequest,
    current_user=Depends(get_current_user),
) -> CharacterPublic:
    """Add, remove, or update a resource (spell slots, abilities). GM only."""
    char = await get_character_or_404(character_id)
    campaign_id = char["campaign_id"]
    if not campaign_id:
        raise HTTPException(status_code=400, detail="Character is not in a campaign")
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    resources = decode_json(char["resources"]) if isinstance(char["resources"], str) else char["resources"]
    if not isinstance(resources, list):
        resources = []

    action = payload.action
    if action == "add":
        resources.append(payload.resource)
        log_msg = f"{char['name']} : nouvelle ressource {payload.resource.get('name', '?')}"
    elif action == "remove":
        if payload.index is None or payload.index < 0 or payload.index >= len(resources):
            raise HTTPException(status_code=422, detail="Invalid index for remove action")
        removed = resources.pop(payload.index)
        log_msg = f"{char['name']} : ressource {removed.get('name', '?')} retiree"
    elif action == "update":
        if payload.index is None or payload.index < 0 or payload.index >= len(resources):
            raise HTTPException(status_code=422, detail="Invalid index for update action")
        resources[payload.index] = payload.resource
        log_msg = f"{char['name']} : ressource {payload.resource.get('name', '?')} mise a jour"

    row = await get_pool().fetchrow(
        "update characters set resources = $1::jsonb, updated_at = now() where id = $2 returning *",
        json.dumps(resources),
        character_id,
    )

    await get_pool().execute(
        """insert into game_log_entries (campaign_id, user_id, entry_type, visibility, message, payload)
           values ($1, $2, 'note', 'gm', $3, '{}'::jsonb)""",
        campaign_id,
        current_user["id"],
        log_msg,
    )

    return character_public(row)
