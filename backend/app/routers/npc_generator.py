"""Phase 49: Générateur de PNJ — endpoint API."""

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query

from app.deps import get_current_user
from app.npc_generator import generate_npc
from app.schemas import NpcPublic

router = APIRouter(prefix="/api/npc", tags=["npc"])


@router.get("/generate", response_model=NpcPublic)
async def generate(
    race: str | None = Query(None, description="Forcer une race (optionnel)"),
    genre: str | None = Query(None, description="Forcer un genre (optionnel)"),
    _=Depends(get_current_user),
):
    """Génère un PNJ aléatoire complet (nom, apparence, personnalité, secret…).

    Passe `race` et/ou `genre` en query params pour forcer ces attributs.
    Sinon, ils sont tirés au hasard.
    """
    npc = generate_npc()
    if race:
        npc["race"] = race
    if genre:
        npc["genre"] = genre
    return NpcPublic(**npc)


@router.post("/bulk", response_model=list[NpcPublic])
async def generate_bulk(
    count: int = Query(default=5, ge=1, le=20, description="Nombre de PNJ à générer"),
    _=Depends(get_current_user),
):
    """Génère plusieurs PNJ en une requête (max 20)."""
    npcs = [generate_npc() for _ in range(count)]
    return [NpcPublic(**n) for n in npcs]
