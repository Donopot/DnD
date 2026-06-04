from typing import Any

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query

from app.db import get_pool
from app.deps import get_current_user
from app.schemas import SpellPublic

router = APIRouter(prefix="/api/spells", tags=["spells"])


def _spell_public(row: Any) -> SpellPublic:
    data = dict(row)
    return SpellPublic(**data)


# ── Search / List ──────────────────────────────────────────────────────────

@router.get("", response_model=list[SpellPublic])
async def search_spells(
    q: str | None = Query(None, description="Search by name or description"),
    level: int | None = Query(None, ge=0, le=9),
    school: str | None = Query(None),
    spell_class: str | None = Query(None, alias="class"),
    ritual: bool | None = Query(None),
    concentration: bool | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user=Depends(get_current_user),
):
    """Search the spellbook with optional filters."""
    pool = get_pool()
    clauses = ["1=1"]
    params: list[Any] = []

    if q:
        params.append(f"%{q}%")
        clauses.append(f"(name ilike ${len(params)} OR description ilike ${len(params)})")

    if level is not None:
        params.append(level)
        clauses.append(f"level = ${len(params)}")

    if school:
        params.append(school)
        clauses.append(f"school = ${len(params)}")

    if spell_class:
        params.append(spell_class)
        clauses.append(f"${len(params)} = any(classes)")

    if ritual is not None:
        params.append(ritual)
        clauses.append(f"ritual = ${len(params)}")

    if concentration is not None:
        params.append(concentration)
        clauses.append(f"concentration = ${len(params)}")

    params.append(limit)
    params.append(offset)
    where = " AND ".join(clauses)

    query = "SELECT * FROM spells WHERE " + where + " ORDER BY level, name LIMIT $" + str(len(params)-1) + " OFFSET $" + str(len(params))
    rows = await pool.fetch(query, *params)
    return [_spell_public(r) for r in rows]


# ── Single spell ───────────────────────────────────────────────────────────

@router.get("/{spell_id}", response_model=SpellPublic)
async def get_spell(spell_id: str, _user=Depends(get_current_user)):
    from uuid import UUID
    row = await get_pool().fetchrow("SELECT * FROM spells WHERE id = $1", UUID(spell_id))
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Spell not found")
    return _spell_public(row)
