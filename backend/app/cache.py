"""
Redis cache layer for frequently-read VTT resources.

- Scenes (list + single): 30s TTL
- Fog of war: 30s TTL  
- Handouts (list): 30s TTL
- SRD rules: 300s TTL (rarely changes)

Invalidated on any write to the same resource group.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger("dnd.cache")

_redis: aioredis.Redis | None = None

TTL = 30  # seconds for dynamic resources
TTL_STATIC = 300  # seconds for SRD / static references


async def init_cache() -> None:
    """Connect to Redis. Called from app lifespan startup."""
    global _redis
    settings = get_settings()
    _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        await _redis.ping()
        logger.info("Redis cache connected (%s)", settings.redis_url)
    except Exception:
        logger.warning("Redis unreachable — cache disabled")
        _redis = None


async def close_cache() -> None:
    """Close Redis connection. Called from app lifespan shutdown."""
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


def _client() -> aioredis.Redis | None:
    return _redis


async def cache_get(key: str) -> Any | None:
    """Get a cached JSON value. Returns None on miss or if cache is disabled."""
    client = _client()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl: int = TTL) -> None:
    """Set a cached JSON value with TTL."""
    client = _client()
    if client is None:
        return
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        pass


async def cache_invalidate(pattern: str) -> None:
    """Delete all keys matching *pattern*."""
    client = _client()
    if client is None:
        return
    try:
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
    except Exception:
        pass
