"""Shared utilities for the DnD backend."""

import json
from typing import Any


def decode_json(value: Any) -> Any:
    """Decode a JSON string to a Python object, or pass through non-strings.

    PostgreSQL JSONB columns are returned as strings by asyncpg when cast
    explicitly. This helper normalises them for Pydantic model construction.
    """
    if isinstance(value, str):
        return json.loads(value)
    return value


def jsonb(value: Any) -> str:
    """Serialize a Python object to a JSON string for ``::jsonb`` casts."""
    return json.dumps(value)


DEFAULT_LIMIT = 50
MAX_LIMIT = 200
