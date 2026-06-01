"""Unit tests for security utilities.

Requires env vars to be set before import — see conftest.py or run with:
  backend_secret_key=test database_url=x redis_url=x minio_endpoint=x minio_bucket=x minio_access_key=x minio_secret_key=x pytest tests/
"""

import os
from uuid import uuid4

import pytest
from fastapi import HTTPException


# Ensure required env vars exist before importing app modules
_ENV_DEFAULTS = {
    "backend_secret_key": "test-secret-key-for-unit-tests-only",
    "database_url": "postgresql://localhost/test",
    "redis_url": "redis://localhost:6379",
    "minio_endpoint": "http://localhost:9000",
    "minio_bucket": "test-bucket",
    "minio_access_key": "minioadmin",
    "minio_secret_key": "minioadmin",
}
for k, v in _ENV_DEFAULTS.items():
    os.environ.setdefault(k, v)


from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "secure-password-123"
        hashed = hash_password(password)
        assert hashed != password
        assert isinstance(hashed, str)
        assert verify_password(password, hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_different_passwords_different_hashes(self):
        h1 = hash_password("alpha")
        h2 = hash_password("beta")
        assert h1 != h2

    def test_same_password_different_salts(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt uses random salt
        assert verify_password("same", h1) is True
        assert verify_password("same", h2) is True


class TestJWT:
    @pytest.fixture
    def user_id(self):
        return uuid4()

    def test_create_and_decode(self, user_id):
        token = create_access_token(user_id)
        assert isinstance(token, str)
        decoded = decode_access_token(token)
        assert decoded == user_id

    def test_expired_token(self, monkeypatch):
        monkeypatch.setattr("app.security.settings.access_token_ttl_minutes", -1)
        user_id = uuid4()
        token = create_access_token(user_id)
        with pytest.raises(HTTPException) as exc:
            decode_access_token(token)
        assert exc.value.status_code == 401
        assert "Invalid or expired token" in exc.value.detail

    def test_invalid_token(self):
        with pytest.raises(HTTPException) as exc:
            decode_access_token("not-a-valid-jwt")
        assert exc.value.status_code == 401

    def test_tampered_token(self, user_id):
        token = create_access_token(user_id)
        tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
        with pytest.raises(HTTPException) as exc:
            decode_access_token(tampered)
        assert exc.value.status_code == 401


class TestUtils:
    def test_decode_json_string(self):
        from app.utils import decode_json
        assert decode_json('{"key": "value"}') == {"key": "value"}

    def test_decode_json_non_string(self):
        from app.utils import decode_json
        data = {"already": "dict"}
        assert decode_json(data) is data

    def test_decode_json_list(self):
        from app.utils import decode_json
        assert decode_json('[1, 2, 3]') == [1, 2, 3]

    def test_jsonb_roundtrip(self):
        from app.utils import jsonb, decode_json
        data = {"nested": {"list": [1, "two", None]}}
        serialized = jsonb(data)
        assert isinstance(serialized, str)
        assert decode_json(serialized) == data
