"""Tests for asset endpoints — schema validation and route structure."""

from uuid import uuid4

import pytest

FIXED_CAMPAIGN = uuid4()
FIXED_USER = uuid4()


@pytest.mark.anyio
async def test_list_assets_requires_auth(client):
    """GET /api/campaigns/{id}/assets without auth → 401."""
    resp = await client.get(f"/api/campaigns/{FIXED_CAMPAIGN}/assets")
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_upload_requires_auth(client):
    """POST without auth → 401 (before content-type check)."""
    resp = await client.post(
        f"/api/campaigns/{FIXED_CAMPAIGN}/assets",
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_asset_content_requires_auth(client):
    """GET /api/assets/{id}/content without auth → 401."""
    resp = await client.get(f"/api/assets/{FIXED_CAMPAIGN}/content")
    assert resp.status_code == 401
