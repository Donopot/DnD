"""
Tests for WS movement permissions (PR 3 — Sprint 2 remediation plan).

Covers:
- authorize_token_movement (shared auth primitive)
- _validate_move_payload (size and angle validation)
- _require_uuid (UUID extraction from WS messages)
"""

import asyncio
import json
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest


# ============================================================================
# validate_move_payload — size and angle validation
# ============================================================================

class TestValidateMovePayload:
    def test_valid_xy_only(self):
        from app.routers.session import _validate_move_payload
        _validate_move_payload(100, 200, None, None)  # should not raise

    def test_valid_with_size_and_angle(self):
        from app.routers.session import _validate_move_payload
        _validate_move_payload(100, 200, 2, 90)  # size=2, angle=90 — valid

    def test_size_too_small(self):
        from app.routers.session import _validate_move_payload
        with pytest.raises(ValueError, match="size must be 1-20"):
            _validate_move_payload(100, 200, 0, None)

    def test_size_too_large(self):
        from app.routers.session import _validate_move_payload
        with pytest.raises(ValueError, match="size must be 1-20"):
            _validate_move_payload(100, 200, 21, None)

    def test_angle_out_of_range_negative(self):
        from app.routers.session import _validate_move_payload
        with pytest.raises(ValueError, match="angle must be 0-360"):
            _validate_move_payload(100, 200, None, -5)

    def test_angle_out_of_range_high(self):
        from app.routers.session import _validate_move_payload
        with pytest.raises(ValueError, match="angle must be 0-360"):
            _validate_move_payload(100, 200, None, 361)

    def test_extreme_coords_still_rejected(self):
        from app.routers.session import _validate_move_payload
        with pytest.raises(ValueError, match="out of range"):
            _validate_move_payload(2_000_000, 0, None, None)


# ============================================================================
# _require_uuid — UUID extraction
# ============================================================================

class TestRequireUuid:
    def test_valid_uuid(self):
        from app.routers.session import _require_uuid
        uid = uuid4()
        result = _require_uuid({"token_id": str(uid)}, "token_id")
        assert result == uid

    def test_missing_key(self):
        from app.routers.session import _require_uuid
        with pytest.raises(ValueError, match="missing required field"):
            _require_uuid({}, "token_id")

    def test_invalid_uuid_string(self):
        from app.routers.session import _require_uuid
        with pytest.raises(ValueError, match="invalid token_id"):
            _require_uuid({"token_id": "not-a-uuid"}, "token_id")


# ============================================================================
# authorize_token_movement — shared auth primitive
# ============================================================================

def _make_token(campaign_id=None, character_id=None):
    return {
        "campaign_id": campaign_id or str(uuid4()),
        "character_id": character_id,
    }


def _mock_pool(fetchrow_return=None, fetchval_returns=None):
    """Create a mock get_pool() function.

    fetchrow_return: single return value or callable for all fetchrow calls
    fetchval_returns: list of return values for sequential fetchval calls
    """
    pool = AsyncMock()
    if fetchval_returns:
        pool.fetchval = AsyncMock(side_effect=fetchval_returns)
    else:
        pool.fetchval = AsyncMock(return_value=None)

    if callable(fetchrow_return):
        pool.fetchrow = AsyncMock(side_effect=fetchrow_return)
    else:
        pool.fetchrow = AsyncMock(return_value=fetchrow_return)

    def _get_pool():
        return pool

    return _get_pool


class TestAuthorizeTokenMovement:
    """Unit-level tests for the shared authorization function."""

    async def _run(self, token, user_id, role, *, fetchrow=None, fetchval=None):
        """Run authorize_token_movement with mocked DB."""
        from unittest.mock import patch

        from app.permissions import authorize_token_movement

        get_pool = _mock_pool(fetchrow, fetchval)
        with patch("app.permissions.get_pool", get_pool):
            await authorize_token_movement(token, user_id, role)

    @pytest.mark.asyncio
    async def test_gm_can_move_any_token(self):
        """GM should always be authorized regardless of token state."""
        token = _make_token()
        # Should not raise
        await self._run(token, uuid4(), "gm", fetchrow={"role": "gm"})

    @pytest.mark.asyncio
    async def test_co_gm_can_move_any_token(self):
        """Co-GM should have same privileges as GM."""
        token = _make_token()
        await self._run(token, uuid4(), "co_gm", fetchrow={"role": "co_gm"})

    @pytest.mark.asyncio
    async def test_player_blocked_on_npc_token(self):
        """Player cannot move a token with no character_id."""
        token = _make_token(character_id=None)
        with pytest.raises(ValueError, match="NPC or unlinked"):
            await self._run(token, uuid4(), "player", fetchrow={"role": "player"})

    @pytest.mark.asyncio
    async def test_player_blocked_when_not_owner(self):
        """Player cannot move another player's token."""
        token = _make_token(character_id=str(uuid4()))
        with pytest.raises(ValueError, match="only move their own"):
            await self._run(
                token, uuid4(), "player",
                fetchrow={"role": "player"},
                fetchval=[None],  # ownership check fails
            )

    @pytest.mark.asyncio
    async def test_player_blocked_when_movement_disabled(self):
        """Player blocked when allow_player_token_move is False."""
        token = _make_token(character_id=str(uuid4()))
        with pytest.raises(ValueError, match="disabled by the GM"):
            await self._run(
                token, uuid4(), "player",
                fetchrow={"role": "player"},
                fetchval=[
                    1,  # ownership check passes
                    json.dumps({"allow_player_token_move": False}),
                ],
            )

    @pytest.mark.asyncio
    async def test_player_can_move_own_token_when_allowed(self):
        """Player can move their own token when GM allows it."""
        token = _make_token(character_id=str(uuid4()))
        # Should not raise
        await self._run(
            token, uuid4(), "player",
            fetchrow={"role": "player"},
            fetchval=[
                1,  # ownership check passes
                json.dumps({"allow_player_token_move": True}),
            ],
        )

    @pytest.mark.asyncio
    async def test_player_blocked_when_not_campaign_member(self):
        """Non-members cannot move tokens."""
        token = _make_token()
        with pytest.raises(ValueError, match="not a member"):
            await self._run(token, uuid4(), "gm", fetchrow=None)
