"""Tests d'integration API — Validation, Auth, Routing.

Utilise FastAPI avec DB mockee via httpx.AsyncClient + ASGITransport.
Couvre: health, docs, validation de schemas, auth (401/422), routing (404/405).
"""

import pytest

# ============================================================================
# Health & Docs
# ============================================================================

@pytest.mark.anyio
async def test_docs_accessible(client):
    """GET /openapi.json est accessible et contient les routes attendues."""
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    spec = resp.json()
    assert "paths" in spec
    assert "/api/auth/register" in spec["paths"]
    assert "/api/auth/login" in spec["paths"]


# ============================================================================
# Auth — Register validation
# ============================================================================

@pytest.mark.anyio
async def test_register_missing_fields(client):
    """POST /api/auth/register sans email => 422."""
    resp = await client.post("/api/auth/register", json={
        "display_name": "Test",
        "password": "ValidP@ss1",
        "confirm_password": "ValidP@ss1",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_register_missing_password(client):
    """POST /api/auth/register sans password => 422."""
    resp = await client.post("/api/auth/register", json={
        "email": "test@test.com",
        "display_name": "Test",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_register_password_mismatch(client):
    """POST /api/auth/register avec passwords differents => 422."""
    resp = await client.post("/api/auth/register", json={
        "email": "test@test.com",
        "display_name": "Test",
        "password": "ValidP@ss1",
        "confirm_password": "Different1",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_register_weak_password(client):
    """POST /api/auth/register avec mot de passe faible => 422."""
    resp = await client.post("/api/auth/register", json={
        "email": "test@test.com",
        "display_name": "Test",
        "password": "weak",
        "confirm_password": "weak",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_register_invalid_email(client):
    """POST /api/auth/register avec email invalide => 422."""
    resp = await client.post("/api/auth/register", json={
        "email": "not-an-email",
        "display_name": "Test",
        "password": "ValidP@ss1",
        "confirm_password": "ValidP@ss1",
    })
    assert resp.status_code == 422


# ============================================================================
# Auth — Login validation
# ============================================================================

@pytest.mark.anyio
async def test_login_missing_fields(client):
    """POST /api/auth/login sans email => 422."""
    resp = await client.post("/api/auth/login", json={
        "password": "somepass",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_login_missing_password(client):
    """POST /api/auth/login sans password => 422."""
    resp = await client.post("/api/auth/login", json={
        "email": "test@test.com",
    })
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_login_invalid_email_format(client):
    """POST /api/auth/login avec email invalide => 422."""
    resp = await client.post("/api/auth/login", json={
        "email": "not-an-email",
        "password": "somepass",
    })
    assert resp.status_code == 422


# ============================================================================
# Auth — Me (endpoint protege)
# ============================================================================

@pytest.mark.anyio
async def test_me_no_auth(client):
    """GET /api/auth/me sans auth => 401."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_me_invalid_token(client):
    """GET /api/auth/me avec token invalide => 401."""
    resp = await client.get("/api/auth/me", headers={
        "Authorization": "Bearer ***"})
    assert resp.status_code == 401


# ============================================================================
# Campaigns — validation + gm_settings decode (P0 fix)
# ============================================================================

@pytest.mark.anyio
async def test_create_campaign_no_auth(client):
    """POST /api/campaigns sans auth => 401."""
    resp = await client.post("/api/campaigns", json={
        "name": "Test Campaign",
    })
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_create_and_list_campaigns_gm_settings_decoded(client, gm_user_row, auth_headers, mock_pool):
    """P0: gm_settings JSON string '{}' → dict {} by decode_json."""
    from uuid import uuid4
    from app.deps import get_current_user
    from app.deps import require_gm_account
    from unittest.mock import AsyncMock, MagicMock

    campaign_id = uuid4()
    campaign_row = {
        "id": campaign_id,
        "owner_user_id": gm_user_row["id"],
        "name": "Test Campaign",
        "description": "A test",
        "gm_settings": "{}",  # PostgreSQL returns JSON as string
        "created_at": "2026-06-10T00:00:00Z",
        "updated_at": "2026-06-10T00:00:00Z",
    }

    # Connection mock for transaction — its fetchrow handles the INSERT returning
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value=campaign_row)  # INSERT returning
    conn.execute = AsyncMock()
    tx = AsyncMock()
    tx.__aenter__ = AsyncMock()
    tx.__aexit__ = AsyncMock(return_value=None)
    conn.transaction = MagicMock(return_value=tx)
    acquired = AsyncMock()
    acquired.__aenter__ = AsyncMock(return_value=conn)
    acquired.__aexit__ = AsyncMock(return_value=None)
    mock_pool.acquire = MagicMock(return_value=acquired)

    post_create_row = {**campaign_row, "role": "gm", "member_count": 1}
    # fetchrow: all calls return post_create_row (the post-transaction select result)
    mock_pool.fetchrow = AsyncMock(return_value=post_create_row)

    app = client._transport.app
    # get_pool() is called directly (not via Depends), must set global pool
    import app.db as db_module
    db_module.pool = mock_pool
    async def _user():
        return gm_user_row
    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[require_gm_account] = _user

    # POST create
    resp = await client.post("/api/campaigns", json={
        "name": "Test Campaign", "description": "A test",
    }, headers=auth_headers)
    assert resp.status_code == 201, f"POST failed: {resp.text}"
    body = resp.json()
    assert body["gm_settings"] == {
        "allow_player_token_move": True,
        "show_player_hp": True,
        "fog_enabled": True,
        "player_fog_reveal": True,
        "show_initiative_to_players": True,
        "allow_player_map_pan": True,
    }, (
        f"Expected defaults merged, got: {body['gm_settings']}"
    )

    # GET list — gm_settings must also be decoded with defaults
    mock_pool.fetch = AsyncMock(return_value=[post_create_row])
    mock_pool.fetchrow = AsyncMock(return_value=gm_user_row)

    resp2 = await client.get("/api/campaigns", headers=auth_headers)
    assert resp2.status_code == 200
    campaigns = resp2.json()
    assert len(campaigns) == 1
    assert campaigns[0]["gm_settings"] == body["gm_settings"], (
        f"List gm_settings mismatch: {campaigns[0]['gm_settings']}"
    )

    app.dependency_overrides.clear()


# ============================================================================
# Characters — validation
# ============================================================================

@pytest.mark.anyio
async def test_create_character_no_auth(client):
    """POST /api/campaigns/{id}/characters sans auth => 401."""
    from uuid import uuid4
    resp = await client.post(f"/api/campaigns/{uuid4()}/characters", json={
        "name": "Hero",
    })
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_list_my_characters_static_route_is_not_parsed_as_uuid(client):
    """GET /characters/mine must reach the static vault endpoint."""
    resp = await client.get("/api/characters/mine")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Authentification requise"



# ============================================================================
# Routing
# ============================================================================

@pytest.mark.anyio
async def test_unknown_route(client):
    """GET /api/route-inexistante => 404."""
    resp = await client.get("/api/route-inexistante")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_method_not_allowed(client):
    """PATCH /api/auth/login => 405 Method Not Allowed."""
    resp = await client.patch("/api/auth/login")
    assert resp.status_code == 405


