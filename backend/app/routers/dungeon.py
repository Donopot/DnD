from fastapi import APIRouter
from fastapi import Depends

from app.deps import get_current_user
from app.dungeon import generate_dungeon
from app.schemas import DungeonGenerateRequest

router = APIRouter(prefix="/api/dungeon", tags=["dungeon"])


@router.post("/generate")
async def generate(request: DungeonGenerateRequest, _user=Depends(get_current_user)):
    """Generate a procedural dungeon map."""
    dungeon = generate_dungeon(
        width=request.width,
        height=request.height,
        room_count=request.room_count,
        seed=request.seed,
        theme=request.theme,
    )
    return dungeon
