"""Fixtures communes pour les tests d'integration API.

Mocke la base de donnees PostgreSQL pour tester le layer HTTP sans DB reelle.
"""

import os
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport
from httpx import AsyncClient

# Env vars minimales pour l'import de l'app
os.environ.setdefault("BACKEND_SECRET_KEY", "test-secret-for-integration-tests")
os.environ.setdefault("DATABASE_URL", "postgresql://test:x@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("MINIO_ENDPOINT", "http://localhost:9000")
os.environ.setdefault("MINIO_BUCKET", "test-bucket")
os.environ.setdefault("MINIO_ACCESS_KEY", "minioadmin")
os.environ.setdefault("MINIO_SECRET_KEY", "minioadmin")


@pytest.fixture
def mock_pool():
    """Mock de pool asyncpg."""
    pool = MagicMock()
    pool.fetchrow = AsyncMock()
    pool.fetch = AsyncMock()
    pool.execute = AsyncMock()
    return pool


@pytest.fixture
async def client(mock_pool):
    """Test client HTTP avec DB mockee."""
    from app.main import app

    app.dependency_overrides = {}

    async def override_get_pool():
        return mock_pool

    from app.db import get_pool
    app.dependency_overrides[get_pool] = override_get_pool

    # Bypass cache init
    from app.cache import close_cache as _cc
    from app.cache import init_cache as _ic
    app.dependency_overrides[_ic] = AsyncMock()
    app.dependency_overrides[_cc] = AsyncMock()

    from app.limiter import shared_limiter
    shared_limiter.enabled = False

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    shared_limiter.enabled = True


@pytest.fixture
def gm_user_row():
    """Ligne utilisateur MJ mock."""
    return {
        "id": uuid4(),
        "email": "gm@test.com",
        "display_name": "GM Test",
        "account_type": "gm",
        "password_hash": "$2b$12$" + "0" * 53,
    }


@pytest.fixture
def gm_token(gm_user_row):
    """Token JWT pour le MJ mock."""
    from app.security import create_access_token
    return create_access_token(gm_user_row["id"])


@pytest.fixture
def auth_headers(gm_token):
    """Headers auth."""
    return {"Authorization": "Bearer " + gm_token}
