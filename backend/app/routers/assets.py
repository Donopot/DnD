import asyncio
import re
from uuid import UUID
from uuid import uuid4

import boto3
from botocore.client import Config
from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import Query
from fastapi import UploadFile
from fastapi import status
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.db import get_pool
from app.deps import get_current_user
from app.deps import require_campaign_role
from app.schemas import AssetPublic
from app.schemas import SceneBackgroundUpdateRequest
from app.schemas import ScenePublic

router = APIRouter(prefix="/api", tags=["assets"])

ALLOWED_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
}

MAX_UPLOAD_BYTES = 15 * 1024 * 1024

# ── S3 helpers (non-blocking via asyncio.to_thread) ────────────────────────


def _build_s3_client():
    """Build a boto3 S3 client (synchronous — called inside to_thread)."""
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


async def s3_put_object(key: str, body: bytes, content_type: str) -> None:
    """Upload an object to S3 without blocking the event loop."""
    settings = get_settings()

    def _put():
        client = _build_s3_client()
        client.put_object(
            Bucket=settings.minio_bucket,
            Key=key,
            Body=body,
            ContentType=content_type,
        )

    await asyncio.to_thread(_put)


async def s3_get_object(key: str) -> dict:
    """Download an object from S3 without blocking the event loop."""
    settings = get_settings()

    def _get():
        client = _build_s3_client()
        return client.get_object(
            Bucket=settings.minio_bucket,
            Key=key,
        )

    return await asyncio.to_thread(_get)


# ── Helpers ────────────────────────────────────────────────────────────────


def safe_filename(filename: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", filename.strip())
    return cleaned[:120] or "asset"


def asset_public(row) -> AssetPublic:
    data = dict(row)
    data["content_url"] = f"/api/assets/{row['id']}/content"
    return AssetPublic(**data)


def scene_public(row) -> ScenePublic:
    return ScenePublic(**dict(row))


async def get_asset_or_404(asset_id: UUID):
    row = await get_pool().fetchrow(
        """
        select *
        from campaign_assets
        where id = $1
        """,
        asset_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return row


async def get_scene_or_404(scene_id: UUID):
    row = await get_pool().fetchrow(
        """
        select *
        from campaign_scenes
        where id = $1
        """,
        scene_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return row


# ── Routes ─────────────────────────────────────────────────────────────────


@router.get("/campaigns/{campaign_id}/assets", response_model=list[AssetPublic])
async def list_assets(
    campaign_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
) -> list[AssetPublic]:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})

    rows = await get_pool().fetch(
        """
        select *
        from campaign_assets
        where campaign_id = $1
        order by created_at desc
        limit $2 offset $3
        """,
        campaign_id,
        limit,
        offset,
    )

    return [asset_public(row) for row in rows]


@router.post(
    "/campaigns/{campaign_id}/assets",
    response_model=AssetPublic,
    status_code=status.HTTP_201_CREATED,
)
async def upload_asset(
    campaign_id: UUID,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
) -> AssetPublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PNG, JPEG, WebP and GIF images are supported",
        )

    content = await file.read()
    size_bytes = len(content)

    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if size_bytes > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file is too large")

    filename = safe_filename(file.filename or "map")
    object_key = f"campaigns/{campaign_id}/assets/{uuid4()}-{filename}"

    await s3_put_object(object_key, content, content_type)

    row = await get_pool().fetchrow(
        """
        insert into campaign_assets (
            campaign_id,
            uploader_user_id,
            name,
            object_key,
            content_type,
            size_bytes,
            asset_type
        )
        values ($1, $2, $3, $4, $5, $6, 'map')
        returning *
        """,
        campaign_id,
        current_user["id"],
        filename,
        object_key,
        content_type,
        size_bytes,
    )

    return asset_public(row)


@router.get("/assets/{asset_id}/content")
async def asset_content(
    asset_id: UUID,
    current_user=Depends(get_current_user),
):
    asset = await get_asset_or_404(asset_id)
    await require_campaign_role(
        asset["campaign_id"], current_user["id"], {"gm", "co_gm", "player"}
    )

    response = await s3_get_object(asset["object_key"])
    body = response["Body"]
    etag = response.get("ETag", "").strip('"')
    content_length = response.get("ContentLength")
    last_modified = response.get("LastModified")

    headers: dict[str, str] = {
        "Content-Disposition": f'inline; filename="{safe_filename(asset["name"])}"',
        "Cache-Control": "public, max-age=3600, immutable",
    }
    if etag:
        headers["ETag"] = f'"{etag}"'
    if content_length is not None:
        headers["Content-Length"] = str(content_length)
    if last_modified is not None:
        headers["Last-Modified"] = last_modified.strftime("%a, %d %b %Y %H:%M:%S GMT")

    return StreamingResponse(
        body,
        media_type=asset["content_type"],
        headers=headers,
    )


@router.patch("/scenes/{scene_id}/background", response_model=ScenePublic)
async def update_scene_background(
    scene_id: UUID,
    payload: SceneBackgroundUpdateRequest,
    current_user=Depends(get_current_user),
) -> ScenePublic:
    scene = await get_scene_or_404(scene_id)
    await require_campaign_role(scene["campaign_id"], current_user["id"], {"gm", "co_gm"})

    background_url = None

    if payload.asset_id is not None:
        asset = await get_asset_or_404(payload.asset_id)
        if asset["campaign_id"] != scene["campaign_id"]:
            raise HTTPException(
                status_code=400, detail="Asset does not belong to this campaign"
            )
        background_url = f"/api/assets/{asset['id']}/content"

    row = await get_pool().fetchrow(
        """
        update campaign_scenes
        set
            background_asset_id = $2,
            background_url = $3,
            updated_at = now()
        where id = $1
        returning *
        """,
        scene_id,
        payload.asset_id,
        background_url,
    )

    return scene_public(row)
