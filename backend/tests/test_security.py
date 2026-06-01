"""Unit tests for security utilities and auth schema validation.

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
    "redis_url": "redis://localhost/test",
    "minio_endpoint": "localhost:9000",
    "minio_bucket": "test",
    "minio_access_key": "test",
    "minio_secret_key": "testtest",
}

for key, value in _ENV_DEFAULTS.items():
    os.environ.setdefault(key, value)


# ── JWT security ──────────────────────────────────────────────────────────

class TestJWT:
    @pytest.fixture
    def user_id(self):
        return uuid4()

    def test_create_and_decode(self, user_id):
        from app.security import create_access_token, decode_access_token
        token = create_access_token(user_id)
        assert isinstance(token, str)
        decoded = decode_access_token(token)
        assert decoded == user_id

    def test_expired_token(self, monkeypatch):
        from app.security import create_access_token, decode_access_token
        monkeypatch.setattr("app.security.settings.access_token_ttl_minutes", -1)
        user_id = uuid4()
        token = create_access_token(user_id)
        with pytest.raises(HTTPException) as exc:
            decode_access_token(token)
        assert exc.value.status_code == 401
        assert "Invalid or expired token" in exc.value.detail

    def test_invalid_token(self):
        from app.security import decode_access_token
        with pytest.raises(HTTPException) as exc:
            decode_access_token("not-a-valid-jwt")
        assert exc.value.status_code == 401

    def test_tampered_token(self, user_id):
        from app.security import create_access_token, decode_access_token
        token = create_access_token(user_id)
        tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
        with pytest.raises(HTTPException) as exc:
            decode_access_token(tampered)
        assert exc.value.status_code == 401


# ── RegisterRequest schema validation ─────────────────────────────────────

VALID_REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "display_name": "Test User",
    "password": "Str0ngP@ss",
    "confirm_password": "Str0ngP@ss",
    "account_type": "gm",
}


class TestRegisterSchema:
    """Validate RegisterRequest schema rules — no DB needed."""

    def test_valid_registration(self):
        from app.schemas import RegisterRequest
        req = RegisterRequest(**VALID_REGISTER_PAYLOAD)
        assert req.email == "test@example.com"
        assert req.account_type == "gm"

    def test_password_mismatch(self):
        """confirm_password != password → ValidationError"""
        from pydantic import ValidationError
        from app.schemas import RegisterRequest
        payload = {**VALID_REGISTER_PAYLOAD, "confirm_password": "Different1"}
        with pytest.raises(ValidationError) as exc:
            RegisterRequest(**payload)
        errors = str(exc.value)
        assert "correspondent" in errors.lower() or "match" in errors.lower()

    def test_password_no_uppercase(self):
        """password sans majuscule → ValidationError"""
        from pydantic import ValidationError
        from app.schemas import RegisterRequest
        payload = {**VALID_REGISTER_PAYLOAD, "password": "nolower1", "confirm_password": "nolower1"}
        with pytest.raises(ValidationError) as exc:
            RegisterRequest(**payload)
        errors = str(exc.value).lower()
        assert "majuscule" in errors

    def test_password_no_lowercase(self):
        """password sans minuscule → ValidationError"""
        from pydantic import ValidationError
        from app.schemas import RegisterRequest
        payload = {**VALID_REGISTER_PAYLOAD, "password": "UPPERCASE1", "confirm_password": "UPPERCASE1"}
        with pytest.raises(ValidationError) as exc:
            RegisterRequest(**payload)
        errors = str(exc.value).lower()
        assert "minuscule" in errors

    def test_password_no_digit(self):
        """password sans chiffre → ValidationError"""
        from pydantic import ValidationError
        from app.schemas import RegisterRequest
        payload = {**VALID_REGISTER_PAYLOAD, "password": "NoDigitsHere", "confirm_password": "NoDigitsHere"}
        with pytest.raises(ValidationError) as exc:
            RegisterRequest(**payload)
        errors = str(exc.value).lower()
        assert "chiffre" in errors

    def test_password_too_short(self):
        """password < 8 caractères → ValidationError"""
        from pydantic import ValidationError
        from app.schemas import RegisterRequest
        payload = {**VALID_REGISTER_PAYLOAD, "password": "Ab1", "confirm_password": "Ab1"}
        with pytest.raises(ValidationError):
            RegisterRequest(**payload)

    def test_honeypot_allowed_when_empty(self):
        """website vide → accepté"""
        from app.schemas import RegisterRequest
        payload = {**VALID_REGISTER_PAYLOAD, "website": ""}
        req = RegisterRequest(**payload)
        assert req.website == ""


# ── Utils ──────────────────────────────────────────────────────────────────

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
