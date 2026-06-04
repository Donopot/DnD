from typing import Any

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query

from app.db import get_pool
from app.deps import get_current_user
from app.schemas import ItemPublic
from app.utils import decode_json

router = APIRouter(prefix="/api/items", tags=["items"])


def _item_public(row: Any) -> ItemPublic:
    data = dict(row)
    data["properties"] = decode_json(data.get("properties", "[]"))
    return ItemPublic(**data)


@router.get("", response_model=list[ItemPublic])
async def search_items(
    q: str | None = Query(None),
    category: str | None = Query(None),
    rarity: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user=Depends(get_current_user),
):
    pool = get_pool()
    clauses = ["1=1"]
    params: list[Any] = []

    if q:
        params.append(f"%{q}%")
        clauses.append(f"name ilike ${len(params)}")

    if category:
        params.append(category)
        clauses.append(f"category = ${len(params)}")

    if rarity:
        params.append(rarity)
        clauses.append(f"rarity = ${len(params)}")

    params.extend([limit, offset])
    where = " AND ".join(clauses)

    query = "SELECT * FROM items WHERE " + where + " ORDER BY rarity, name LIMIT $" + str(len(params)-1) + " OFFSET $" + str(len(params))
    rows = await pool.fetch(query, *params)
    return [_item_public(r) for r in rows]


@router.get("/{item_id}", response_model=ItemPublic)
async def get_item(item_id: str, _user=Depends(get_current_user)):
    from uuid import UUID
    row = await get_pool().fetchrow("SELECT * FROM items WHERE id = $1", UUID(item_id))
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    return _item_public(row)
