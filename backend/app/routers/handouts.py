from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import get_pool
from app.deps import get_current_user, require_campaign_role
from app.realtime import manager
from app.schemas import HandoutCreateRequest, HandoutPublic, HandoutUpdateRequest

router = APIRouter(prefix="/api", tags=["handouts"])


def handout_public(row) -> HandoutPublic:
    return HandoutPublic(**dict(row))


async def get_handout_or_404(handout_id: UUID):
    row = await get_pool().fetchrow(
        """
        select *
        from handouts
        where id = $1
        """,
        handout_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Handout not found")
    return row


async def validate_handout_links(campaign_id: UUID, scene_id: UUID | None, asset_id: UUID | None) -> None:
    if scene_id is not None:
        scene_exists = await get_pool().fetchval(
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
        if not scene_exists:
            raise HTTPException(status_code=400, detail="Scene does not belong to this campaign")

    if asset_id is not None:
        asset_exists = await get_pool().fetchval(
            """
            select exists (
                select 1
                from campaign_assets
                where id = $1 and campaign_id = $2
            )
            """,
            asset_id,
            campaign_id,
        )
        if not asset_exists:
            raise HTTPException(status_code=400, detail="Asset does not belong to this campaign")


def _visibility_filter(role: str) -> str:
    """Build a visibility WHERE clause based on user role."""
    if role in {"gm", "co_gm"}:
        return "true"
    return "(visibility = 'public' or (visibility = 'players' and is_revealed = true))"


@router.get("/campaigns/{campaign_id}/handouts", response_model=list[HandoutPublic])
async def list_handouts(
    campaign_id: UUID,
    scene_id: UUID | None = Query(default=None),
    current_user=Depends(get_current_user),
) -> list[HandoutPublic]:
    role = await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})

    scene_filter = ""
    params: list = [campaign_id]
    if scene_id is not None:
        scene_filter = "and scene_id = $2"
        params.append(scene_id)

    rows = await get_pool().fetch(
        f"""
        select *
        from handouts
        where campaign_id = $1
          {scene_filter}
          and {_visibility_filter(role)}
        order by is_revealed desc, updated_at desc
        """,
        *params,
    )

    return [handout_public(row) for row in rows]


@router.post("/campaigns/{campaign_id}/handouts", response_model=HandoutPublic, status_code=status.HTTP_201_CREATED)
async def create_handout(
    campaign_id: UUID,
    payload: HandoutCreateRequest,
    current_user=Depends(get_current_user),
) -> HandoutPublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    await validate_handout_links(campaign_id, payload.scene_id, payload.asset_id)

    row = await get_pool().fetchrow(
        """
        insert into handouts (
            campaign_id, author_user_id, title, content, visibility, asset_id, scene_id
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning *
        """,
        campaign_id,
        current_user["id"],
        payload.title.strip(),
        payload.content,
        payload.visibility,
        payload.asset_id,
        payload.scene_id,
    )

    return handout_public(row)


@router.get("/handouts/{handout_id}", response_model=HandoutPublic)
async def get_handout(
    handout_id: UUID,
    current_user=Depends(get_current_user),
) -> HandoutPublic:
    handout = await get_handout_or_404(handout_id)
    role = await require_campaign_role(handout["campaign_id"], current_user["id"], {"gm", "co_gm", "player"})

    if role not in {"gm", "co_gm"}:
        if handout["visibility"] == "gm" or handout["visibility"] == "gm_team":
            raise HTTPException(status_code=404, detail="Handout not found")
        if handout["visibility"] == "players" and not handout["is_revealed"]:
            raise HTTPException(status_code=404, detail="Handout not found")

    return handout_public(handout)


@router.patch("/handouts/{handout_id}", response_model=HandoutPublic)
async def update_handout(
    handout_id: UUID,
    payload: HandoutUpdateRequest,
    current_user=Depends(get_current_user),
) -> HandoutPublic:
    existing = await get_handout_or_404(handout_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})

    current = dict(existing)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        current[key] = value.strip() if isinstance(value, str) and key == "title" else value

    await validate_handout_links(existing["campaign_id"], current["scene_id"], current["asset_id"])

    was_revealed = existing["is_revealed"]
    is_now_revealed = current.get("is_revealed", False)

    row = await get_pool().fetchrow(
        """
        update handouts
        set
            title = $2,
            content = $3,
            visibility = $4,
            asset_id = $5,
            scene_id = $6,
            is_revealed = $7,
            revealed_at = case when $7 = true and is_revealed = false then now() else revealed_at end,
            updated_at = now()
        where id = $1
        returning *
        """,
        handout_id,
        current["title"],
        current["content"],
        current["visibility"],
        current["asset_id"],
        current["scene_id"],
        current["is_revealed"],
    )

    result = handout_public(row)

    if not was_revealed and is_now_revealed:
        await manager.broadcast(
            existing["campaign_id"],
            {
                "type": "session_changed",
                "resource": "handout",
                "campaign_id": str(existing["campaign_id"]),
                "handout_id": str(handout_id),
                "visibility": current.get("visibility", existing["visibility"]),
            },
        )

    return result


@router.delete("/handouts/{handout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_handout(
    handout_id: UUID,
    current_user=Depends(get_current_user),
) -> None:
    existing = await get_handout_or_404(handout_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})

    await get_pool().execute(
        """
        delete from handouts
        where id = $1
        """,
        handout_id,
    )
