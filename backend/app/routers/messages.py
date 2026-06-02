"""Phase 21: Communication MJ↔Joueur — messages privés, annonces, jets secrets."""

from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from app.db import get_pool
from app.deps import get_current_user
from app.deps import require_campaign_role
from app.dice import roll_formula as roll_dice
from app.schemas import GmAnnouncementCreate
from app.schemas import GmMessageCreate
from app.schemas import GmMessagePublic
from app.schemas import GmSecretRollCreate

router = APIRouter(prefix="/api", tags=["messages"])


def message_public(row) -> GmMessagePublic:
    return GmMessagePublic(
        id=row["id"],
        campaign_id=row["campaign_id"],
        sender_id=row["sender_id"],
        recipient_id=row["recipient_id"],
        content=row["content"],
        kind=row["kind"],
        roll_data=row["roll_data"],
        read_at=row["read_at"],
        created_at=row["created_at"],
    )


# ── Send private message ──────────────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/messages", response_model=GmMessagePublic, status_code=201)
async def send_message(
    campaign_id: UUID,
    payload: GmMessageCreate,
    current_user=Depends(get_current_user),
) -> GmMessagePublic:
    """GM sends a private message to a specific player."""
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    # Verify recipient is a member of the campaign
    recipient = await get_pool().fetchrow(
        "select user_id from campaign_members where campaign_id = $1 and user_id = $2",
        campaign_id,
        payload.recipient_id,
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Joueur introuvable dans cette campagne")

    row = await get_pool().fetchrow(
        """
        insert into gm_messages (campaign_id, sender_id, recipient_id, content, kind)
        values ($1, $2, $3, $4, 'message')
        returning *
        """,
        campaign_id,
        current_user["id"],
        payload.recipient_id,
        payload.content.strip(),
    )
    return message_public(row)


# ── Broadcast announcement ────────────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/announce", response_model=GmMessagePublic, status_code=201)
async def send_announcement(
    campaign_id: UUID,
    payload: GmAnnouncementCreate,
    current_user=Depends(get_current_user),
) -> GmMessagePublic:
    """GM broadcasts an announcement to all players."""
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    row = await get_pool().fetchrow(
        """
        insert into gm_messages (campaign_id, sender_id, content, kind)
        values ($1, $2, $3, 'announcement')
        returning *
        """,
        campaign_id,
        current_user["id"],
        payload.content.strip(),
    )
    return message_public(row)


# ── Secret roll ───────────────────────────────────────────────────────────


@router.post("/campaigns/{campaign_id}/secret-roll", response_model=GmMessagePublic, status_code=201)
async def secret_roll(
    campaign_id: UUID,
    payload: GmSecretRollCreate,
    current_user=Depends(get_current_user),
) -> GmMessagePublic:
    """GM rolls dice secretly. Optionally share with one player."""
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    result = roll_dice(payload.formula)
    roll_data = {
        "formula": payload.formula,
        "total": result.total,
        "detail": result.detail,
    }

    display = f"🎲 {payload.label}: {payload.formula} → **{result.total}**"

    row = await get_pool().fetchrow(
        """
        insert into gm_messages (campaign_id, sender_id, recipient_id, content, kind, roll_data)
        values ($1, $2, $3, $4, 'secret_roll', $5::jsonb)
        returning *
        """,
        campaign_id,
        current_user["id"],
        payload.recipient_id,
        display,
        roll_data,
    )
    return message_public(row)


# ── Player inbox ──────────────────────────────────────────────────────────


@router.get("/campaigns/{campaign_id}/inbox", response_model=list[GmMessagePublic])
async def get_inbox(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> list[GmMessagePublic]:
    """Get private messages and secret rolls for the current player."""
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})

    rows = await get_pool().fetch(
        """
        select *
        from gm_messages
        where campaign_id = $1
          and recipient_id = $2
          and kind in ('message', 'secret_roll')
        order by created_at desc
        limit 50
        """,
        campaign_id,
        current_user["id"],
    )
    return [message_public(row) for row in rows]


# ── Announcements (read by all) ───────────────────────────────────────────


@router.get("/campaigns/{campaign_id}/announcements", response_model=list[GmMessagePublic])
async def get_announcements(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> list[GmMessagePublic]:
    """Get campaign-wide announcements (visible to all members)."""
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})

    rows = await get_pool().fetch(
        """
        select *
        from gm_messages
        where campaign_id = $1
          and kind = 'announcement'
        order by created_at desc
        limit 30
        """,
        campaign_id,
    )
    return [message_public(row) for row in rows]


# ── Mark as read ──────────────────────────────────────────────────────────


@router.post("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    message_id: UUID,
    current_user=Depends(get_current_user),
) -> None:
    """Mark a message as read."""
    row = await get_pool().fetchrow(
        "select id, recipient_id from gm_messages where id = $1",
        message_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Message introuvable")
    if row["recipient_id"] and row["recipient_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    await get_pool().execute(
        "update gm_messages set read_at = now() where id = $1",
        message_id,
    )
