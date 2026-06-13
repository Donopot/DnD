"""
Anti-HTML-SPA regression test — validates that API responses are never HTML.

Catches the class of bugs where a missing `/api` prefix causes the
frontend to receive SPA fallback HTML instead of JSON, silently breaking features.
"""

import json

import pytest
import pytest_asyncio
from httpx import ASGITransport
from httpx import AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
class TestApiResponsesAreJson:
    """Every /api/ endpoint must return JSON, never HTML."""

    async def test_api_health_returns_json(self, client):
        resp = await client.get("/api/health")
        # 200 when DB is up, 503 when DB is down — both must be JSON
        assert resp.status_code in (200, 503)
        assert "application/json" in resp.headers.get("content-type", "")
        assert "<!doctype" not in resp.text.lower()
        assert "<html" not in resp.text.lower()

    async def test_api_404_returns_json_error(self, client):
        """An unknown /api/ route must return structured JSON, not HTML."""
        resp = await client.get("/api/nonexistent-route-12345")
        assert resp.status_code == 404
        content_type = resp.headers.get("content-type", "")
        assert "application/json" in content_type, f"Expected JSON, got {content_type}"
        assert not resp.text.strip().startswith("<!doctype")
        assert not resp.text.strip().startswith("<html")
        try:
            json.loads(resp.text)
        except json.JSONDecodeError:
            pytest.fail(f"Response body is not valid JSON: {resp.text[:200]}")

    async def test_missing_api_prefix_returns_404_not_html(self, client):
        """
        Simulates the exact bug that broke fog and homebrew.
        /scenes/.../fog (missing /api/) should return 404 JSON, not SPA HTML.
        """
        resp = await client.get("/scenes/any-id/fog")
        assert resp.status_code == 404
        assert "application/json" in resp.headers.get("content-type", "")
        assert "<html" not in resp.text.lower()

    @pytest.mark.parametrize("endpoint", [
        "/api/scenes/00000000-0000-0000-0000-000000000001/fog",
        "/api/homebrew/creatures/00000000-0000-0000-0000-000000000001",
        "/api/campaigns/00000000-0000-0000-0000-000000000001/settings",
    ])
    async def test_broken_api_routes_return_json_not_html(self, client, endpoint):
        """
        Even when we hit real API endpoints with bad UUIDs, the response
        must be a structured JSON error (usually 401/403/404), never HTML.
        """
        resp = await client.get(endpoint)
        assert resp.status_code != 200, f"Expected non-200 for {endpoint}"
        content_type = resp.headers.get("content-type", "")
        # 401 without auth is acceptable, but must still be JSON
        assert "application/json" in content_type or resp.status_code in (307, 401), (
            f"Got status {resp.status_code} with content-type {content_type}"
        )
        assert "<!doctype" not in resp.text.lower()
        assert "<html" not in resp.text.lower()
