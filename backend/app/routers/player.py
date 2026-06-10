from contextlib import suppress
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from app.db import get_pool
from app.deps import get_current_user
from app.deps import require_campaign_role
from app.schemas import CharacterPublic
from app.schemas import HandoutPublic
from app.schemas import PlayerEncounterPublic
from app.schemas import ScenePublic
from app.schemas import TokenPublic
from app.utils import decode_json

router = APIRouter(prefix="/api", tags=["player"])


def _player_role() -> set[str]:
    return {"player"}


async def _get_gm_settings(campaign_id: UUID) -> dict:
    """Load campaign gm_settings, decoding JSON string → dict."""
    row = await get_pool().fetchval(
        "select gm_settings from campaigns where id = $1", campaign_id,
    )
    return decode_json(row) or {}


# --- Audit helper (non-blocking, best-effort) ---
async def _audit(
    campaign_id: UUID,
    user_id: UUID,
    resource_type: str,
    resource_id: UUID | None,
    action: str,
    granted: bool,
    role: str,
) -> None:
    with suppress(Exception):
        await get_pool().execute(
            """
            insert into permission_audit (campaign_id, user_id, resource_type, resource_id, action, granted, role)
            values ($1,$2,$3,$4,$5,$6,$7)
            """,
            campaign_id, user_id, resource_type, resource_id, action, granted, role,
        )  # audit failure must never break real functionality


# ============================================================
# Player-specific endpoints — strictly filtered views
# ============================================================

@router.get("/campaigns/{campaign_id}/player/summary")
async def player_campaign_summary(campaign_id: UUID, current_user=Depends(get_current_user)):
    role = await require_campaign_role(campaign_id, current_user["id"], {"player"})
    await _audit(campaign_id, current_user["id"], "campaign", campaign_id, "view", True, role)

    row = await get_pool().fetchrow(
        """
        select id, owner_user_id, name, description, created_at, updated_at
        from campaigns where id = $1
        """,
        campaign_id,
    )
    if row is None:
        raise HTTPException(404, "Campaign not found")

    members = await get_pool().fetch(
        """
        select u.id as user_id, u.display_name, cm.role, cm.joined_at
        from campaign_members cm join users u on u.id = cm.user_id
        where cm.campaign_id = $1
        order by cm.joined_at asc
        """,
        campaign_id,
    )
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "description": row["description"],
        "owner_user_id": str(row["owner_user_id"]),
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
        "members": [dict(m) for m in members],
    }


@router.get("/campaigns/{campaign_id}/player/characters", response_model=list[CharacterPublic])
async def player_my_characters(campaign_id: UUID, current_user=Depends(get_current_user)):
    role = await require_campaign_role(campaign_id, current_user["id"], {"player"})
    await _audit(campaign_id, current_user["id"], "character", None, "list_own", True, role)
    rows = await get_pool().fetch(
        "select * from characters where campaign_id = $1 and owner_user_id = $2 order by name asc",
        campaign_id, current_user["id"],
    )
    return [CharacterPublic(**dict(r)) for r in rows]


@router.get("/campaigns/{campaign_id}/player/scenes", response_model=list[ScenePublic])
async def player_scenes(campaign_id: UUID, current_user=Depends(get_current_user)):
    role = await require_campaign_role(campaign_id, current_user["id"], {"player"})
    await _audit(campaign_id, current_user["id"], "scene", None, "list", True, role)
    rows = await get_pool().fetch(
        "select * from campaign_scenes where campaign_id = $1 and is_secret = false "
        "order by is_active desc, created_at asc",
        campaign_id,
    )
    return [ScenePublic(**dict(r)) for r in rows]


@router.get("/player/scenes/{scene_id}/tokens", response_model=list[TokenPublic])
async def player_scene_tokens(scene_id: UUID, current_user=Depends(get_current_user)):
    scene = await get_pool().fetchrow("select * from campaign_scenes where id = $1", scene_id)
    if scene is None:
        raise HTTPException(404, "Scene not found")
    role = await require_campaign_role(scene["campaign_id"], current_user["id"], {"player"})
    await _audit(scene["campaign_id"], current_user["id"], "token", scene_id, "list", True, role)
    rows = await get_pool().fetch(
        "select * from scene_tokens where scene_id = $1 and is_hidden = false order by z_index asc, created_at asc",
        scene_id,
    )
    # Strip metadata for player view
    return [TokenPublic(**{**dict(r), "metadata": {}}) for r in rows]


@router.get("/campaigns/{campaign_id}/player/handouts", response_model=list[HandoutPublic])
async def player_handouts(campaign_id: UUID, current_user=Depends(get_current_user)):
    role = await require_campaign_role(campaign_id, current_user["id"], {"player"})
    await _audit(campaign_id, current_user["id"], "handout", None, "list", True, role)
    rows = await get_pool().fetch(
        """
        select * from handouts
        where campaign_id = $1
          and (visibility = 'public' or (visibility = 'players' and is_revealed = true))
        order by updated_at desc
        """,
        campaign_id,
    )
    return [HandoutPublic(**dict(r)) for r in rows]


@router.get("/player/encounters/{encounter_id}", response_model=PlayerEncounterPublic)
async def player_encounter(encounter_id: UUID, current_user=Depends(get_current_user)):
    encounter = await get_pool().fetchrow("select * from combat_encounters where id = $1", encounter_id)
    if encounter is None:
        raise HTTPException(404, "Encounter not found")
    role = await require_campaign_role(encounter["campaign_id"], current_user["id"], {"player"})
    await _audit(encounter["campaign_id"], current_user["id"], "encounter", encounter_id, "view", True, role)

    gm_settings = await _get_gm_settings(encounter["campaign_id"])
    show_hp = gm_settings.get("show_player_hp", True)
    show_initiative = gm_settings.get("show_initiative_to_players", True)

    combatants = await get_pool().fetch(
        "select * from combatants where encounter_id = $1 and is_hidden = false order by initiative desc",
        encounter_id,
    )
    return PlayerEncounterPublic(
        id=encounter["id"],
        name=encounter["name"],
        status=encounter["status"],
        round_number=encounter["round_number"] if show_initiative else 0,
        turn_index=encounter["turn_index"] if show_initiative else 0,
        combatants=[
            {
                "id": str(c["id"]),
                "name": c["name"],
                "initiative": c["initiative"] if show_initiative else 0,
                "armor_class": c["armor_class"] if show_hp else 0,
                "hp_current": c["hp_current"] if show_hp else 0,
                "hp_max": c["hp_max"] if show_hp else 0,
                "conditions": c["conditions"] if show_hp else "[]",
                "is_defeated": c["is_defeated"],
            }
            for c in combatants
        ],
    )


# ============================================================
# GM audit endpoints — view audit log
# ============================================================

@router.get("/campaigns/{campaign_id}/audit")
async def campaign_audit_log(campaign_id: UUID, current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm"})
    rows = await get_pool().fetch(
        """
        select pa.*, u.email, u.display_name
        from permission_audit pa
        join users u on u.id = pa.user_id
        where pa.campaign_id = $1
        order by pa.created_at desc
        limit 100
        """,
        campaign_id,
    )
    return [
        {
            "id": str(r["id"]),
            "user": {"id": str(r["user_id"]), "email": r["email"], "display_name": r["display_name"]},
            "resource_type": r["resource_type"],
            "resource_id": str(r["resource_id"]) if r["resource_id"] else None,
            "action": r["action"],
            "granted": r["granted"],
            "role": r["role"],
            "at": r["created_at"].isoformat(),
        }
        for r in rows
    ]
