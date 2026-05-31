import asyncpg
import boto3
from botocore.client import Config
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_db, connect_db
from app.routers import auth, campaigns, characters, session, vtt, combat, assets, gm_notes

settings = get_settings()

app = FastAPI(title="DnD SaaS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(campaigns.router)
app.include_router(characters.router)
app.include_router(session.router)
app.include_router(vtt.router)
app.include_router(combat.router)
app.include_router(assets.router)
app.include_router(gm_notes.router)
app.include_router(session.ws_router)


@app.on_event("startup")
async def startup() -> None:
    await connect_db()


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_db()


@app.get("/api/health")
async def health() -> dict[str, object]:
    checks: dict[str, object] = {
        "service": "dnd-backend",
        "status": "ok",
        "database": "unknown",
        "object_storage": "unknown",
    }

    connection = await asyncpg.connect(settings.database_url)
    try:
        await connection.fetchval("select 1")
        checks["database"] = "ok"
    finally:
        await connection.close()

    minio = boto3.client(
        "s3",
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )
    minio.head_bucket(Bucket=settings.minio_bucket)
    checks["object_storage"] = "ok"

    return checks


@app.websocket("/ws/health")
async def websocket_health(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await websocket.send_json({"service": "dnd-backend", "websocket": "ok"})
        while True:
            message = await websocket.receive_text()
            await websocket.send_json({"echo": message})
    except WebSocketDisconnect:
        return
