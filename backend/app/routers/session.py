import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from app.db import get_pool
from app.deps import get_current_user, require_campaign_role
from app.dice import roll_with_mode
from app.realtime import manager
from app.schemas import (
    GameLogEntryPublic,
    GameLogNoteRequest,
    LogExportRequest,
    RollCreateRequest,
    RollPublic,
    SessionMarkerRequest,
)
from app.security import decode_access_token

router = APIRouter(prefix="/api", tags=["session"])
ws_router = APIRouter(tags=["realtime"])


def decode_json(value):
    if isinstance(value, str):
        return json.loads(value)
    return value


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

    async with get_pool().acquire() as connection:
        async with connection.transaction():
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
        limit 100
        """,
        campaign_id,
    )
    return [roll_public(row) for row in rows]


@router.get("/campaigns/{campaign_id}/log", response_model=list[GameLogEntryPublic])
async def list_log(
    campaign_id: UUID,
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
        f"select * from game_log_entries where {where} order by created_at desc limit 200",
        *params,
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
        insert into game_log_entries (campaign_id, user_id, entry_type, visibility, message, payload, pinned, session_marker)
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
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = decode_access_token(token)
        row = await get_pool().fetchrow(
            """
            select role
            from campaign_members
            where campaign_id = $1 and user_id = $2
            """,
            campaign_id,
            user_id,
        )
        if row is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    count = await manager.connect(campaign_id, websocket)
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
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        count = manager.disconnect(campaign_id, websocket)
        await manager.broadcast(
            campaign_id,
            {
                "type": "presence",
                "campaign_id": str(campaign_id),
                "presence_count": count,
            },
        )
