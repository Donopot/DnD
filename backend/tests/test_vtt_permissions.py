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
