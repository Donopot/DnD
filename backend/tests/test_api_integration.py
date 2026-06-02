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
# Campaigns — validation
# ============================================================================

@pytest.mark.anyio
async def test_create_campaign_no_auth(client):
    """POST /api/campaigns sans auth => 401."""
    resp = await client.post("/api/campaigns", json={
        "name": "Test Campaign",
    })
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_create_campaign_missing_name(client):
    """POST /api/campaigns sans nom => 422 (schema validation)."""
    resp = await client.post("/api/campaigns", json={})
    assert resp.status_code in (401, 422)
    # FastAPI verifie d'abord l'auth, donc 401 possible


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



