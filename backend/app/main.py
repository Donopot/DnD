import asyncio
from contextlib import asynccontextmanager

import asyncpg
import boto3
from botocore.client import Config
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
from fastapi import status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.cache import cache_ping
from app.cache import close_cache
from app.cache import init_cache
from app.config import get_settings
from app.db import close_db
from app.db import connect_db
from app.limiter import shared_limiter
from app.routers import assets
from app.routers import auth
from app.routers import bestiary
from app.routers import campaigns
from app.routers import characters
from app.routers import combat
from app.routers import dungeon
from app.routers import gm_notes
from app.routers import handouts
from app.routers import homebrew
from app.routers import items
from app.routers import messages
from app.routers import npc_generator
from app.routers import player
from app.routers import session
from app.routers import spells
from app.routers import vtt

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    await init_cache()
    yield
    await close_cache()
    await close_db()


app = FastAPI(
    title="DnD SaaS API",
    version="0.11.1",
    lifespan=lifespan,
)
app.state.limiter = shared_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(bestiary.router)
app.include_router(spells.router)
app.include_router(dungeon.router)
app.include_router(items.router)
app.include_router(campaigns.router)
app.include_router(characters.router)
app.include_router(session.router)
app.include_router(vtt.router)
app.include_router(combat.router)
app.include_router(assets.router)
app.include_router(gm_notes.router)
app.include_router(handouts.router)
app.include_router(homebrew.router)
app.include_router(player.router)
app.include_router(messages.router)
app.include_router(npc_generator.router)
app.include_router(session.ws_router)


@app.get("/api/health")
@shared_limiter.exempt
async def health() -> dict[str, object]:
    checks: dict[str, object] = {
        "service": "dnd-backend",
        "status": "ok",
        "database": "unknown",
        "object_storage": "unknown",
        "redis": "unknown",
    }

    errors: list[Exception] = []
    connection = None
    try:
        connection = await asyncpg.connect(settings.database_url)
        await connection.fetchval("select 1")
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = "error"
        errors.append(exc)
    finally:
        if connection is not None:
            await connection.close()

    try:
        minio = boto3.client(
            "s3",
            endpoint_url=settings.minio_endpoint,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(
                signature_version="s3v4",
                connect_timeout=3,
                read_timeout=3,
                retries={"max_attempts": 1},
            ),
            region_name="us-east-1",
        )
        await asyncio.to_thread(minio.head_bucket, Bucket=settings.minio_bucket)
        checks["object_storage"] = "ok"
    except Exception as exc:
        checks["object_storage"] = "error"
        errors.append(exc)

    if await cache_ping():
        checks["redis"] = "ok"
    else:
        checks["redis"] = "error"
        errors.append(RuntimeError("Redis is unavailable"))

    if errors:
        checks["status"] = "error"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=checks,
        )

    return checks


@app.websocket("/ws/health")
@shared_limiter.exempt
async def websocket_health(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await websocket.send_json({"service": "dnd-backend", "websocket": "ok"})
        while True:
            message = await websocket.receive_text()
            await websocket.send_json({"echo": message})
    except WebSocketDisconnect:
        return
