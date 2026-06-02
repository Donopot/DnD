import logging
import math
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from pydantic import BaseModel
from pydantic import field_validator

from app.cache import cache_get
from app.cache import cache_invalidate
from app.cache import cache_set
from app.db import get_pool
from app.deps import get_current_user
from app.deps import require_campaign_role
from app.realtime import manager
from app.schemas import SceneCreateRequest
from app.schemas import ScenePublic
from app.schemas import SceneSettingsUpdateRequest
from app.schemas import TokenCreateRequest
from app.schemas import TokenMoveRequest
from app.schemas import TokenPublic
from app.schemas import TokenUpdateRequest
from app.utils import decode_json
from app.utils import jsonb

router = APIRouter(prefix="/api", tags=["vtt"])
logger = logging.getLogger("dnd.vtt")


def scene_public(row) -> ScenePublic:
    return ScenePublic(**dict(row))


def token_public(row) -> TokenPublic:
    data = dict(row)
    data["metadata"] = decode_json(data["metadata"])
    return TokenPublic(**data)


def token_public_filtered(row) -> TokenPublic:
    """Token view for players — metadata is stripped to prevent GM info leaks."""
    data = dict(row)
    data["metadata"] = {}  # players never see token metadata
    return TokenPublic(**data)


async def get_scene_or_404(scene_id: UUID):
    row = await get_pool().fetchrow(
        """
        select *
        from campaign_scenes
        where id = $1
        """,
        scene_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return row


async def get_token_or_404(token_id: UUID):
    row = await get_pool().fetchrow(
        """
        select
            st.*,
            cs.campaign_id
        from scene_tokens st
        join campaign_scenes cs on cs.id = st.scene_id
        where st.id = $1
        """,
        token_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Token not found")
    return row


async def validate_character_for_scene(scene_id: UUID, character_id: UUID | None, user_id: UUID, role: str) -> None:
    if character_id is None:
        return

    row = await get_pool().fetchrow(
        """
        select ch.owner_user_id
        from characters ch
        join campaign_scenes cs on cs.campaign_id = ch.campaign_id
        where cs.id = $1 and ch.id = $2
        """,
        scene_id,
        character_id,
    )
    if row is None:
        raise HTTPException(status_code=400, detail="Character does not belong to this scene campaign")
    if role == "player" and row["owner_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Players can only use their own characters")


async def broadcast_vtt_change(campaign_id: UUID, resource: str, scene_id: UUID, token_id: UUID | None = None) -> None:
    await manager.broadcast(
        campaign_id,
        {
            "type": "session_changed",
            "resource": resource,
            "campaign_id": str(campaign_id),
            "scene_id": str(scene_id),
            "token_id": str(token_id) if token_id else None,
        },
    )


async def broadcast_token_move(campaign_id: UUID, scene_id: UUID, token_id: UUID, x: int, y: int) -> None:
    await manager.broadcast(
        campaign_id,
        {
            "type": "token_moved",
            "campaign_id": str(campaign_id),
            "scene_id": str(scene_id),
            "token_id": str(token_id),
            "x": x,
            "y": y,
        },
    )


@router.get("/campaigns/{campaign_id}/scenes", response_model=list[ScenePublic])
async def list_scenes(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> list[ScenePublic]:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})

    cache_key = f"scenes:{campaign_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return [ScenePublic(**s) for s in cached]

    rows = await get_pool().fetch(
        """
        select *
        from campaign_scenes
        where campaign_id = $1
        order by is_active desc, created_at asc
        """,
        campaign_id,
    )
    result = [scene_public(row) for row in rows]
    await cache_set(cache_key, [s.model_dump(mode="json") for s in result])
    return result


@router.post("/campaigns/{campaign_id}/scenes", response_model=ScenePublic, status_code=status.HTTP_201_CREATED)
async def create_scene(
    campaign_id: UUID,
    payload: SceneCreateRequest,
    current_user=Depends(get_current_user),
) -> ScenePublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    async with get_pool().acquire() as connection, connection.transaction():
        scene_count = await connection.fetchval(
            "select count(*) from campaign_scenes where campaign_id = $1",
            campaign_id,
        )
        is_active = payload.is_active or scene_count == 0

        if is_active:
            await connection.execute(
                "update campaign_scenes set is_active = false where campaign_id = $1",
                campaign_id,
            )

        row = await connection.fetchrow(
            """
                insert into campaign_scenes (
                    campaign_id, name, description, grid_size, width, height, background_url, is_active
                )
                values ($1, $2, $3, $4, $5, $6, $7, $8)
                returning *
                """,
            campaign_id,
            payload.name.strip(),
            payload.description.strip(),
            payload.grid_size,
            payload.width,
            payload.height,
            payload.background_url,
            is_active,
        )

    scene = scene_public(row)
    await cache_invalidate(f"scenes:{campaign_id}*")
    await broadcast_vtt_change(campaign_id, "scene", scene.id)
    return scene


@router.get("/scenes/{scene_id}", response_model=ScenePublic)
async def get_scene(
    scene_id: UUID,
    current_user=Depends(get_current_user),
) -> ScenePublic:
    cache_key = f"scene:{scene_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return ScenePublic(**cached)

    row = await get_scene_or_404(scene_id)
    await require_campaign_role(row["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})
    result = scene_public(row)
    await cache_set(cache_key, result.model_dump(mode="json"))
    return result


@router.get("/scenes/{scene_id}/tokens", response_model=list[TokenPublic])
async def list_tokens(
    scene_id: UUID,
    current_user=Depends(get_current_user),
) -> list[TokenPublic]:
    scene = await get_scene_or_404(scene_id)
    role = await require_campaign_role(scene["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})

    hidden_clause = "" if role in {"gm", "co_gm"} else "and is_hidden = false"
    rows = await get_pool().fetch(
        f"""
        select *
        from scene_tokens
        where scene_id = $1 {hidden_clause}
        order by created_at asc
        """,
        scene_id,
    )
    # GM/co-GM see full metadata; players get empty metadata
    if role in {"gm", "co_gm"}:
        return [token_public(row) for row in rows]
    return [token_public_filtered(row) for row in rows]


@router.post("/scenes/{scene_id}/tokens", response_model=TokenPublic, status_code=status.HTTP_201_CREATED)
async def create_token(
    scene_id: UUID,
    payload: TokenCreateRequest,
    current_user=Depends(get_current_user),
) -> TokenPublic:
    scene = await get_scene_or_404(scene_id)
    role = await require_campaign_role(scene["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})
    await validate_character_for_scene(scene_id, payload.character_id, current_user["id"], role)

    if role == "player" and payload.character_id is None:
        raise HTTPException(status_code=403, detail="Players can only create tokens from their own characters")

    row = await get_pool().fetchrow(
        """
        insert into scene_tokens (
            scene_id, character_id, name, x, y, size, color, is_hidden, metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        returning *
        """,
        scene_id,
        payload.character_id,
        payload.name.strip(),
        payload.x,
        payload.y,
        payload.size,
        payload.color.strip(),
        payload.is_hidden,
        jsonb(payload.metadata),
    )
    token = token_public(row)
    await cache_invalidate(f"scene:{scene_id}*")
    await broadcast_vtt_change(scene["campaign_id"], "token", scene_id, token.id)
    return token


@router.patch("/tokens/{token_id}", response_model=TokenPublic)
async def update_token(
    token_id: UUID,
    payload: TokenUpdateRequest,
    current_user=Depends(get_current_user),
) -> TokenPublic:
    existing = await get_token_or_404(token_id)
    role = await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})

    current = dict(existing)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        current[key] = value.strip() if isinstance(value, str) else value

    await validate_character_for_scene(existing["scene_id"], current["character_id"], current_user["id"], role)

    row = await get_pool().fetchrow(
        """
        update scene_tokens
        set
            character_id = $2,
            name = $3,
            x = $4,
            y = $5,
            size = $6,
            color = $7,
            is_hidden = $8,
            metadata = $9::jsonb,
            updated_at = now()
        where id = $1
        returning *
        """,
        token_id,
        current["character_id"],
        current["name"],
        current["x"],
        current["y"],
        current["size"],
        current["color"],
        current["is_hidden"],
        jsonb(decode_json(current["metadata"])),
    )
    token = token_public(row)
    await cache_invalidate(f"scene:{existing['scene_id']}*")
    await broadcast_vtt_change(existing["campaign_id"], "token", existing["scene_id"], token.id)
    return token


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_token(
    token_id: UUID,
    current_user=Depends(get_current_user),
) -> None:
    existing = await get_token_or_404(token_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})
    await get_pool().execute("delete from scene_tokens where id = $1", token_id)
    await cache_invalidate(f"scene:{existing['scene_id']}*")
    await broadcast_vtt_change(existing["campaign_id"], "token", existing["scene_id"], token_id)


@router.patch("/tokens/{token_id}/move", response_model=TokenPublic)
async def move_token(
    token_id: UUID,
    payload: TokenMoveRequest,
    current_user=Depends(get_current_user),
) -> TokenPublic:
    existing = await get_token_or_404(token_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})

    row = await get_pool().fetchrow(
        """
        update scene_tokens
        set x = $2, y = $3, updated_at = now()
        where id = $1
        returning *
        """,
        token_id,
        payload.x,
        payload.y,
    )
    token = token_public(row)
    await cache_invalidate(f"scene:{existing['scene_id']}*")
    await broadcast_token_move(existing["campaign_id"], existing["scene_id"], token.id, token.x, token.y)
    return token


@router.patch("/scenes/{scene_id}/settings", response_model=ScenePublic)
async def update_scene_settings(
    scene_id: UUID,
    payload: SceneSettingsUpdateRequest,
    current_user=Depends(get_current_user),
) -> ScenePublic:
    scene = await get_scene_or_404(scene_id)
    await require_campaign_role(scene["campaign_id"], current_user["id"], {"gm", "co_gm"})

    current = dict(scene)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        current[key] = value

    row = await get_pool().fetchrow(
        """
        update campaign_scenes
        set
            snap_to_grid = $2,
            grid_size = $3,
            width = $4,
            height = $5,
            view_zoom = $6,
            view_pan_x = $7,
            view_pan_y = $8,
            updated_at = now()
        where id = $1
        returning *
        """,
        scene_id,
        current["snap_to_grid"],
        current["grid_size"],
        current["width"],
        current["height"],
        current["view_zoom"],
        current["view_pan_x"],
        current["view_pan_y"],
    )
    result = scene_public(row)
    await cache_invalidate(f"scene:{scene_id}*")
    return result


# ── Phase 16: Fog of War ─────────────────────────────────────────────

class FogZone(BaseModel):
    x: float
    y: float
    width: float
    height: float

    @field_validator("x", "y", "width", "height")
    @classmethod
    def validate_finite_number(cls, value: float) -> float:
        if not math.isfinite(value):
            logger.warning("Rejected fog zone with non-finite coordinate")
            raise ValueError("Fog zone coordinates must be finite")
        return value

    @field_validator("width", "height")
    @classmethod
    def validate_positive_size(cls, value: float) -> float:
        if value <= 0:
            logger.warning("Rejected fog zone with non-positive size")
            raise ValueError("Fog zone width and height must be positive")
        return value


class FogUpdateRequest(BaseModel):
    fog_zones: list[FogZone]


@router.get("/scenes/{scene_id}/fog")
async def get_fog(
    scene_id: UUID,
    current_user=Depends(get_current_user),
):
    cache_key = f"fog:{scene_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    scene = await get_scene_or_404(scene_id)
    await require_campaign_role(scene["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})

    result = {
        "scene_id": str(scene_id),
        "fog_zones": decode_json(scene.get("fog_zones")) or [],
        "scene_width": scene["width"],
        "scene_height": scene["height"],
    }
    await cache_set(cache_key, result)
    return result


@router.patch("/scenes/{scene_id}/fog")
async def update_fog(
    scene_id: UUID,
    payload: FogUpdateRequest,
    current_user=Depends(get_current_user),
):
    scene = await get_scene_or_404(scene_id)
    await require_campaign_role(scene["campaign_id"], current_user["id"], {"gm", "co_gm"})

    await get_pool().fetchrow(
        """
        update campaign_scenes
        set fog_zones = $2::jsonb, updated_at = now()
        where id = $1
        returning *
        """,
        scene_id,
        jsonb([zone.model_dump() for zone in payload.fog_zones]),
    )

    # Broadcast fog change
    await broadcast_vtt_change(scene["campaign_id"], "fog", scene_id)
    await cache_invalidate(f"fog:{scene_id}*")

    return {
        "scene_id": str(scene_id),
        "fog_zones": [zone.model_dump() for zone in payload.fog_zones],
    }
