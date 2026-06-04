from typing import Any

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query

from app.db import get_pool
from app.deps import get_current_user
from app.schemas import BestiaryCreaturePublic
from app.schemas import BestiaryTrait
from app.utils import decode_json

router = APIRouter(prefix="/api/bestiary", tags=["bestiary"])


def _creature_public(row: Any) -> BestiaryCreaturePublic:
    data = dict(row)
    for field in ("traits", "actions", "legendary_actions"):
        data[field] = [
            BestiaryTrait(name=t["name"], desc=t["desc"])
            for t in decode_json(data[field] or "[]")
        ]
    return BestiaryCreaturePublic(**data)


# ── Search / List ──────────────────────────────────────────────────────────

@router.get("", response_model=list[BestiaryCreaturePublic])
async def search_bestiary(
    q: str | None = Query(None, description="Search by name"),
    cr_min: float | None = Query(None, ge=0),
    cr_max: float | None = Query(None, ge=0),
    type: str | None = Query(None, alias="type", description="Monster type"),
    environment: str | None = Query(None),
    size: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user=Depends(get_current_user),
):
    """Search the bestiary with optional filters."""
    pool = get_pool()
    clauses = ["1=1"]
    params: list[Any] = []

    if q:
        params.append(f"%{q}%")
        clauses.append(f"name ilike ${len(params)}")

    if cr_min is not None:
        params.append(cr_min)
        clauses.append(f"cr >= ${len(params)}")

    if cr_max is not None:
        params.append(cr_max)
        clauses.append(f"cr <= ${len(params)}")

    if type:
        params.append(type)
        clauses.append(f"type = ${len(params)}")

    if environment:
        params.append(environment)
        clauses.append(f"${len(params)} = any(environment)")

    if size:
        params.append(size)
        clauses.append(f"size = ${len(params)}")

    params.append(limit)
    params.append(offset)
    where = " AND ".join(clauses)

    query = "SELECT * FROM bestiary WHERE " + where + " ORDER BY cr, name LIMIT $" + str(len(params)-1) + " OFFSET $" + str(len(params))
    rows = await pool.fetch(query, *params)
    return [_creature_public(r) for r in rows]


# ── Single creature ────────────────────────────────────────────────────────

@router.get("/{creature_id}", response_model=BestiaryCreaturePublic)
async def get_creature(creature_id: str, _user=Depends(get_current_user)):
    from uuid import UUID
    row = await get_pool().fetchrow("SELECT * FROM bestiary WHERE id = $1", UUID(creature_id))
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Creature not found")
    return _creature_public(row)


# ── Stats summary (for quick reference) ────────────────────────────────────

@router.get("/{creature_id}/summary")
async def get_creature_summary(creature_id: str, _user=Depends(get_current_user)):
    """Returns a compact summary: name, type, CR, AC, HP, speed, stats."""
    from uuid import UUID
    row = await get_pool().fetchrow(
        (
            "SELECT id, name, type, size, cr, ac, hp, hp_avg, "
            "speed, str, dex, con, int, wis, cha FROM bestiary WHERE id = $1"
        ),
        UUID(creature_id),
    )
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Creature not found")
    return dict(row)
