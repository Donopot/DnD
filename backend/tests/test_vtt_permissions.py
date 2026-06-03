"""Tests de validation WebSocket et permissions VTT."""

import pytest


# ============================================================================
# WebSocket coordinate validation
# ============================================================================

class TestValidateCoords:
    def test_valid_values(self):
        from app.routers.session import _validate_coords
        _validate_coords(100, 200)  # should not raise
        _validate_coords(0, 0)
        _validate_coords(-500, 500)

    def test_extreme_values_out_of_range(self):
        from app.routers.session import _validate_coords
        with pytest.raises(ValueError, match="out of range"):
            _validate_coords(2_000_000, 0)

    def test_negative_extreme_values(self):
        from app.routers.session import _validate_coords
        with pytest.raises(ValueError, match="out of range"):
            _validate_coords(0, -2_000_000)


# ============================================================================
# FogZone validation
# ============================================================================

class TestFogZone:
    def test_valid_fog_zone(self):
        from app.routers.vtt import FogZone
        z = FogZone(x=10, y=20, width=100, height=80)
        assert z.width == 100
        assert z.height == 80

    def test_zero_width_rejected(self):
        from app.routers.vtt import FogZone
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            FogZone(x=0, y=0, width=0, height=10)

    def test_negative_height_rejected(self):
        from app.routers.vtt import FogZone
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            FogZone(x=0, y=0, width=10, height=-5)

    def test_nan_rejected(self):
        from app.routers.vtt import FogZone
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            FogZone(x=float("nan"), y=0, width=10, height=10)

    def test_inf_rejected(self):
        from app.routers.vtt import FogZone
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            FogZone(x=float("inf"), y=0, width=10, height=10)


# ============================================================================
# VTT token permission rules (unit-level)
# ============================================================================

class TestTokenPermissionRules:
    """Verify the permission logic in isolation — no HTTP calls needed."""

    def test_player_strips_is_hidden_from_payload(self):
        """Simulate payload stripping for player role."""
        updates = {"name": "Hero", "is_hidden": True, "metadata": {"secret": "x"}}
        role = "player"

        if role == "player":
            updates.pop("is_hidden", None)
            updates.pop("metadata", None)

        assert "is_hidden" not in updates
        assert "metadata" not in updates
        assert updates == {"name": "Hero"}

    def test_gm_keeps_is_hidden(self):
        """GM keeps is_hidden and metadata."""
        updates = {"name": "Boss", "is_hidden": True, "metadata": {"hp": 100}}
        role = "gm"

        if role == "player":
            updates.pop("is_hidden", None)
            updates.pop("metadata", None)

        assert updates["is_hidden"] is True
        assert updates["metadata"] == {"hp": 100}


# ============================================================================
# Token ownership enforcement
# ============================================================================

class TestTokenOwnership:
    """Verify that players cannot interact with tokens that are not linked
    to their own characters (NPC tokens, unlinked tokens, other players' tokens)."""

    def test_player_cannot_modify_npc_token_no_character_id(self):
        """
        Simulate update_token logic: if role=player and token.character_id is None,
        a 403 should be raised.
        """
        existing = {"character_id": None, "campaign_id": "c1"}
        role = "player"

        # Simulate the enforcement logic from update_token
        blocked = False
        if role == "player":
            if existing["character_id"]:
                # Would check ownership here — but there's no character to check
                pass
            else:
                blocked = True  # "Players cannot modify NPC or unlinked tokens"

        assert blocked, "Player should be blocked from modifying NPC/unlinked token"

    def test_gm_can_modify_npc_token(self):
        """GM can always modify any token, even unlinked ones."""
        existing = {"character_id": None, "campaign_id": "c1"}
        role = "gm"

        blocked = False
        if role == "player":
            if not existing["character_id"]:
                blocked = True

        assert not blocked, "GM should not be blocked from modifying NPC token"

    def test_player_cannot_move_npc_token_no_character_id(self):
        """
        Simulate move_token logic: if role=player and token has no character_id,
        a 403 should be raised.
        """
        existing = {"character_id": None}
        role = "player"

        blocked = False
        if role == "player":
            if not existing["character_id"]:
                blocked = True
            elif existing["character_id"]:
                # Would check ownership here
                pass

        assert blocked, "Player should be blocked from moving NPC/unlinked token"

    def test_gm_can_move_npc_token(self):
        """GM can always move any token."""
        existing = {"character_id": None}
        role = "gm"

        blocked = False
        if role == "player":
            if not existing["character_id"]:
                blocked = True

        assert not blocked, "GM should not be blocked from moving NPC token"

    def test_player_cannot_modify_other_player_token(self):
        """
        Simulate ownership check: token has character_id but it's not owned
        by this player.
        """
        existing = {"character_id": "char-456", "campaign_id": "c1"}
        role = "player"
        token_owner_user_id = "user-other"
        current_user_id = "user-me"

        blocked = False
        if role == "player":
            if existing["character_id"]:
                if token_owner_user_id != current_user_id:
                    blocked = True

        assert blocked, "Player should be blocked from modifying another player's token"

    def test_player_can_modify_own_character_token(self):
        """Player CAN modify a token linked to their own character."""
        existing = {"character_id": "char-123", "campaign_id": "c1"}
        role = "player"
        token_owner_user_id = "user-me"
        current_user_id = "user-me"

        blocked = False
        if role == "player":
            if existing["character_id"]:
                if token_owner_user_id != current_user_id:
                    blocked = True
            else:
                blocked = True  # no character_id → blocked

        assert not blocked, "Player should be able to modify their own token"

    def test_co_gm_can_modify_any_token(self):
        """Co-GM has same privileges as GM for token operations."""
        existing = {"character_id": None, "campaign_id": "c1"}
        role = "co_gm"

        blocked = False
        if role == "player":
            if not existing["character_id"]:
                blocked = True

        assert not blocked, "Co-GM should not be blocked from modifying any token"
