"""
Shared token authorisation primitives — used by both REST and WebSocket handlers.

Every token operation must answer three questions:
1. Does the caller belong to the token's campaign?
2. If the caller is a player, do GM settings allow the action?
3. If the caller is a player, does the token belong to a character they own?
"""

from uuid import UUID

from app.db import get_pool
from app.utils import decode_json


async def authorize_token_movement(
    token: dict,
    user_id: UUID,
    role: str,
) -> None:
    """Raise ValueError when the caller may NOT move the given token.

    `token` must contain at least `campaign_id`, `character_id`.
    Callers are responsible for fetching the full token row beforehand
    (e.g. via `get_token_or_404` or an equivalent JOIN).

    Rules
    -----
    * Every caller must be a campaign member (gm / co_gm / player).
    * GM and co-GM may move any token in their campaign.
    * Players may only move tokens linked to characters they own **and**
      when `allow_player_token_move` is not explicitly disabled.
    """
    campaign_id = token["campaign_id"]

    # ── 1. Campaign membership ────────────────────────────────────
    member = await get_pool().fetchrow(
        "select role from campaign_members where campaign_id = $1 and user_id = $2",
        campaign_id,
        user_id,
    )
    if member is None:
        raise ValueError("Caller is not a member of this campaign")

    # ── 2. GM / co-GM bypass ──────────────────────────────────────
    if role in {"gm", "co_gm"}:
        return

    # ── 3. Player checks ──────────────────────────────────────────
    # 3a. Token must be linked to a character
    if not token.get("character_id"):
        raise ValueError("Players cannot move NPC or unlinked tokens")

    # 3b. That character must belong to this player
    owned = await get_pool().fetchval(
        "select 1 from characters where id = $1 and owner_user_id = $2",
        token["character_id"],
        user_id,
    )
    if not owned:
        raise ValueError("Players can only move their own tokens")

    # 3c. GM setting must allow token movement
    settings_row = await get_pool().fetchval(
        "select gm_settings from campaigns where id = $1",
        campaign_id,
    )
    gm_settings = decode_json(settings_row) or {}
    if gm_settings.get("allow_player_token_move") is False:
        raise ValueError("Token movement is disabled by the GM")
