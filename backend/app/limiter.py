"""Shared rate-limiter instance used by all routers and the main app.

Uses X-Forwarded-For / X-Real-IP headers to get the real client IP when behind
a reverse proxy (Caddy/nginx). Falls back to request.client.host for direct
connections (local dev).
"""

from fastapi import Request
from slowapi import Limiter


def _client_ip(request: Request) -> str:
    """Extract real client IP from reverse-proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real = request.headers.get("X-Real-IP")
    if real:
        return real.strip()
    return request.client.host if request.client else "unknown"


shared_limiter = Limiter(key_func=_client_ip, default_limits=["200/minute"])
