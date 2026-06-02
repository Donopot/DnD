import json
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
from fastapi import status
from jwt import PyJWTError

from app.db import get_pool
from app.deps import get_current_user
from app.deps import require_campaign_role
from app.dice import roll_with_mode
from app.realtime import manager
from app.schemas import GameLogEntryPublic
from app.schemas import GameLogNoteRequest
from app.schemas import RollCreateRequest
from app.schemas import RollPublic
from app.schemas import SessionMarkerRequest
from app.security import decode_access_token
from app.utils import decode_json

router = APIRouter(prefix="/api", tags=["session"])
ws_router = APIRouter(tags=["realtime"])


def roll_public(row) -> RollPublic:
    data = dict(row)
    data["detail"] = decode_json(data["detail"])
    return RollPublic(**data)


def log_public(row) -> GameLogEntryPublic:
    data = dict(row)
    data["payload"] = decode_json(data["payload"])
    return GameLogEntryPublic(**data)


async def validate_character_access(campaign_id: UUID, character_id: UUID | None, user_id: UUID, role: str) -> None:
    if character_id is None:
        return
    row = await get_pool().fetchrow(
        """
        select owner_user_id
        from characters
        where id = $1 and campaign_id = $2
        """,
        character_id,
        campaign_id,
    )
    if row is None:
        raise HTTPException(status_code=400, detail="Character does not belong to this campaign")
    if role == "player" and row["owner_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Players can only roll as their own characters")


@router.post("/campaigns/{campaign_id}/rolls", response_model=RollPublic, status_code=201)
async def create_roll(
    campaign_id: UUID,
    payload: RollCreateRequest,
    current_user=Depends(get_current_user),
) -> RollPublic:
    role = await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    await validate_character_access(campaign_id, payload.character_id, current_user["id"], role)

    try:
        result = roll_with_mode(payload.formula, payload.mode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    async with get_pool().acquire() as connection, connection.transaction():
        roll = await connection.fetchrow(
            """
                insert into dice_rolls (
                    campaign_id, user_id, character_id, visibility, label, formula, mode, total, detail
                )
                values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
                returning *
                """,
            campaign_id,
            current_user["id"],
            payload.character_id,
            payload.visibility,
            payload.label.strip(),
            payload.formula.strip(),
            payload.mode,
            result.total,
            json.dumps(result.detail),
        )
        message = f"{current_user['display_name']} lance {payload.formula.strip()} = {result.total}"
        if payload.label.strip():
            message = f"{payload.label.strip()} - {message}"
        await connection.execute(
            """
                insert into game_log_entries (
                    campaign_id, user_id, character_id, entry_type, visibility, message, payload
                )
                values ($1, $2, $3, 'roll', $4, $5, $6::jsonb)
                """,
            campaign_id,
            current_user["id"],
            payload.character_id,
            payload.visibility,
            message,
            json.dumps({"roll_id": str(roll["id"]), "total": result.total, "detail": result.detail}),
        )

    created_roll = roll_public(roll)
    await manager.broadcast(
        campaign_id,
        {
            "type": "session_changed",
            "resource": "roll",
            "campaign_id": str(campaign_id),
            "visibility": payload.visibility,
        },
    )
    return created_roll


@router.get("/campaigns/{campaign_id}/rolls", response_model=list[RollPublic])
async def list_rolls(
    campaign_id: UUID,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_user),
) -> list[RollPublic]:
    role = await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    visibility_clause = "" if role in {"gm", "co_gm"} else "and visibility = 'public'"
    rows = await get_pool().fetch(
        f"""
        select *
        from dice_rolls
        where campaign_id = $1 {visibility_clause}
        order by created_at desc
        limit $2 offset $3
        """,
        campaign_id,
        limit,
        offset,
    )
    return [roll_public(row) for row in rows]


@router.get("/campaigns/{campaign_id}/log", response_model=list[GameLogEntryPublic])
async def list_log(
    campaign_id: UUID,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    category: str | None = Query(default=None),
    pinned: bool | None = Query(default=None),
    linked_scene_id: UUID | None = Query(default=None),
    linked_encounter_id: UUID | None = Query(default=None),
    current_user=Depends(get_current_user),
) -> list[GameLogEntryPublic]:
    role = await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    filters = ["campaign_id = $1"]
    params: list = [campaign_id]
    idx = 2

    if role not in {"gm", "co_gm"}:
        filters.append("visibility = 'public'")

    if category:
        filters.append(f"category = ${idx}")
        params.append(category)
        idx += 1
    if pinned is not None:
        filters.append(f"pinned = ${idx}")
        params.append(pinned)
        idx += 1
    if linked_scene_id:
        filters.append(f"linked_scene_id = ${idx}::uuid")
        params.append(str(linked_scene_id))
        idx += 1
    if linked_encounter_id:
        filters.append(f"linked_encounter_id = ${idx}::uuid")
        params.append(str(linked_encounter_id))
        idx += 1

    where = " and ".join(filters)
    rows = await get_pool().fetch(
        f"select * from game_log_entries where {where} order by created_at desc limit ${idx} offset ${idx+1}",
        *params,
        limit,
        offset,
    )
    return [log_public(row) for row in rows]


@router.post("/campaigns/{campaign_id}/log", response_model=GameLogEntryPublic, status_code=201)
async def create_log_note(
    campaign_id: UUID,
    payload: GameLogNoteRequest,
    current_user=Depends(get_current_user),
) -> GameLogEntryPublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    row = await get_pool().fetchrow(
        """
        insert into game_log_entries (
            campaign_id, user_id, entry_type, visibility, message, payload
        )
        values ($1, $2, 'note', $3, $4, '{}'::jsonb)
        returning *
        """,
        campaign_id,
        current_user["id"],
        payload.visibility,
        payload.message.strip(),
    )
    entry = log_public(row)
    await manager.broadcast(
        campaign_id,
        {
            "type": "session_changed",
            "resource": "log",
            "campaign_id": str(campaign_id),
            "visibility": payload.visibility,
        },
    )
    return entry


@router.post("/campaigns/{campaign_id}/log/session-marker", response_model=GameLogEntryPublic, status_code=201)
async def create_session_marker(
    campaign_id: UUID,
    payload: SessionMarkerRequest,
    current_user=Depends(get_current_user),
) -> GameLogEntryPublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    row = await get_pool().fetchrow(
        """
        insert into game_log_entries
          (campaign_id, user_id, entry_type, visibility, message, payload, pinned, session_marker)
        values ($1, $2, 'note', 'gm', $3, '{}'::jsonb, true, true)
        returning *
        """,
        campaign_id, current_user["id"], payload.label.strip() or "Session marker",
    )
    return log_public(row)


@router.get("/campaigns/{campaign_id}/log/sessions")
async def list_sessions(campaign_id: UUID, current_user=Depends(get_current_user)):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    markers = await get_pool().fetch(
        """
        select id, message as label, created_at
        from game_log_entries
        where campaign_id = $1 and session_marker = true
        order by created_at asc
        """,
        campaign_id,
    )
    return [
        {"id": str(m["id"]), "label": m["label"], "at": m["created_at"].isoformat()}
        for m in markers
    ]


@router.get("/campaigns/{campaign_id}/log/export")
async def export_log(
    campaign_id: UUID,
    fmt: str = Query(default="markdown", alias="format"),
    category: str | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    filters = ["campaign_id = $1"]
    params: list = [campaign_id]
    if category:
        filters.append("category = $2")
        params.append(category)
    where = " and ".join(filters)
    rows = await get_pool().fetch(
        f"select * from game_log_entries where {where} order by created_at asc limit 500",
        *params,
    )

    if fmt == "json":
        return [log_public(r).model_dump() for r in rows]

    # Markdown export
    lines = ["# Journal de campagne", ""]
    for r in rows:
        ts = r["created_at"].strftime("%H:%M")
        cat = r["category"]
        vis = "🔒" if r["visibility"] == "gm" else ""
        lines.append(f"- **[{ts}]** {vis} {r['message']}  ")
        if r["pinned"]:
            lines[-1] += "📌 "
        lines.append(f"  `{cat}` — {r['entry_type']}")
        lines.append("")
    return {"format": "markdown", "content": "\n".join(lines)}


@router.patch("/log-entries/{entry_id}/pin", response_model=GameLogEntryPublic)
async def toggle_pin(entry_id: UUID, current_user=Depends(get_current_user)):
    entry = await get_pool().fetchrow("select * from game_log_entries where id = $1", entry_id)
    if entry is None:
        raise HTTPException(404, "Log entry not found")
    await require_campaign_role(entry["campaign_id"], current_user["id"], {"gm", "co_gm"})
    row = await get_pool().fetchrow(
        "update game_log_entries set pinned = not pinned where id = $1 returning *",
        entry_id,
    )
    return log_public(row)


@router.patch("/log-entries/{entry_id}/category", response_model=GameLogEntryPublic)
async def update_entry_category(entry_id: UUID, category: str = Query(...), current_user=Depends(get_current_user)):
    valid = {"general", "combat", "rp", "exploration", "gm_note"}
    if category not in valid:
        raise HTTPException(422, f"Invalid category. Must be one of: {valid}")
    entry = await get_pool().fetchrow("select * from game_log_entries where id = $1", entry_id)
    if entry is None:
        raise HTTPException(404, "Log entry not found")
    await require_campaign_role(entry["campaign_id"], current_user["id"], {"gm", "co_gm"})
    row = await get_pool().fetchrow(
        "update game_log_entries set category = $2 where id = $1 returning *",
        entry_id, category,
    )
    return log_public(row)


@ws_router.websocket("/ws/campaigns/{campaign_id}")
async def campaign_socket(websocket: WebSocket, campaign_id: UUID) -> None:
    await websocket.accept()

    # Wait for the first message — must be auth with token
    try:
        first_msg = await websocket.receive_json()
    except WebSocketDisconnect:
        return

    if first_msg.get("type") != "auth" or not first_msg.get("token"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    token = first_msg["token"]

    try:
        user_id = decode_access_token(token)
        row = await get_pool().fetchrow(
            """
            select cm.role, u.display_name
            from campaign_members cm
            join users u on u.id = cm.user_id
            where cm.campaign_id = $1 and cm.user_id = $2
            """,
            campaign_id,
            user_id,
        )
        if row is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        role = row["role"]
        display_name = row["display_name"]
    except (PyJWTError, HTTPException):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    count = manager.register(campaign_id, websocket)
    await websocket.send_json(
        {
            "type": "connected",
            "campaign_id": str(campaign_id),
            "presence_count": count,
        }
    )
    await manager.broadcast(
        campaign_id,
        {
            "type": "presence",
            "campaign_id": str(campaign_id),
            "presence_count": count,
        },
    )

    try:
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "map_ping":
                # Broadcast ping position to all clients in the campaign
                await manager.broadcast(
                    campaign_id,
                    {
                        "type": "map_ping",
                        "x": message.get("x", 0),
                        "y": message.get("y", 0),
                        "user_id": str(user_id),
                        "ts": message.get("ts", 0),
                    },
                )

            elif msg_type == "player_move_token":
                # Player can only move tokens they own (player_controlled)
                token_id = message.get("token_id")
                new_x = message.get("x", 0)
                new_y = message.get("y", 0)
                scene_id = message.get("scene_id")

                if role == "player":
                    # Verify the token belongs to a character owned by this player
                    token_row = await get_pool().fetchrow(
                        "select st.id from scene_tokens st "
                        "join characters c on c.id = st.character_id "
                        "where st.id = $1 and st.scene_id = $2 and c.owner_user_id = $3",
                        token_id,
                        scene_id,
                        user_id,
                    )
                    if not token_row:
                        await websocket.send_json({"type": "error", "detail": "Token non autorisé"})
                        continue

                # Update token position in DB
                await get_pool().execute(
                    "update scene_tokens set x = $1, y = $2, updated_at = now() where id = $3",
                    new_x,
                    new_y,
                    token_id,
                )

                # Broadcast the move to all clients
                await manager.broadcast(
                    campaign_id,
                    {
                        "type": "token_moved",
                        "token_id": str(token_id),
                        "x": new_x,
                        "y": new_y,
                        "user_id": str(user_id),
                    },
                )

            elif msg_type == "chat_message":
                # Broadcast chat message to all clients in campaign
                content = str(message.get("content", ""))[:2000]
                mode = message.get("mode", "ic")  # ic, ooc, whisper
                target = message.get("target")    # display_name for whispers

                if not content.strip():
                    continue

                chat_payload = {
                    "type": "chat_message",
                    "content": content,
                    "mode": mode,
                    "sender_id": str(user_id),
                    "sender_name": display_name,
                    "sender_role": role,
                    "ts": message.get("ts", 0),
                }
                if target:
                    chat_payload["target"] = target

                # Also persist to messages table
                with __import__("contextlib").suppress(Exception):
                    await get_pool().execute(
                        """insert into gm_messages
                           (campaign_id, sender_id, content, kind, created_at)
                           values ($1, $2, $3, $4, now())""",
                        campaign_id,
                        user_id,
                        content,
                        "chat",
                    )

                await manager.broadcast(campaign_id, chat_payload)

            elif msg_type == "ruler":
                # Broadcast ruler measurement (visual only, GM and other players see it)
                await manager.broadcast(
                    campaign_id,
                    {
                        "type": "ruler",
                        "x1": message.get("x1", 0),
                        "y1": message.get("y1", 0),
                        "x2": message.get("x2", 0),
                        "y2": message.get("y2", 0),
                        "user_id": str(user_id),
                    },
                )

            elif msg_type == "aoe_shape":
                # Broadcast AoE shape (cone, sphere, cube, line) — visual only
                await manager.broadcast(
                    campaign_id,
                    {
                        "type": "aoe_shape",
                        "shape": message.get("shape", "sphere"),
                        "x": message.get("x", 0),
                        "y": message.get("y", 0),
                        "size": message.get("size", 30),  # in feet
                        "angle": message.get("angle", 0),
                        "user_id": str(user_id),
                    },
                )

    except WebSocketDisconnect:
        pass
    finally:
        count = manager.disconnect(campaign_id, websocket)
        await manager.broadcast(
            campaign_id,
            {
                "type": "presence",
                "campaign_id": str(campaign_id),
                "presence_count": count,
            },
        )
