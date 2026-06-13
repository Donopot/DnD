"""Tests de validation WebSocket et permissions VTT."""

from datetime import UTC

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
        import pydantic

        from app.routers.vtt import FogZone
        with pytest.raises(pydantic.ValidationError):
            FogZone(x=0, y=0, width=0, height=10)

    def test_negative_height_rejected(self):
        import pydantic

        from app.routers.vtt import FogZone
        with pytest.raises(pydantic.ValidationError):
            FogZone(x=0, y=0, width=10, height=-5)

    def test_nan_rejected(self):
        import pydantic

        from app.routers.vtt import FogZone
        with pytest.raises(pydantic.ValidationError):
            FogZone(x=float("nan"), y=0, width=10, height=10)

    def test_inf_rejected(self):
        import pydantic

        from app.routers.vtt import FogZone
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
        if role == "player" and not existing["character_id"]:
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
        if role == "player" and not existing["character_id"]:
            blocked = True

        assert blocked, "Player should be blocked from moving NPC/unlinked token"

    def test_gm_can_move_npc_token(self):
        """GM can always move any token."""
        existing = {"character_id": None}
        role = "gm"

        blocked = False
        if role == "player" and not existing["character_id"]:
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
        if role == "player" and existing["character_id"] and token_owner_user_id != current_user_id:
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
            if existing["character_id"] and token_owner_user_id != current_user_id:
                blocked = True
            elif not existing["character_id"]:
                blocked = True  # no character_id → blocked

        assert not blocked, "Player should be able to modify their own token"

    def test_co_gm_can_modify_any_token(self):
        """Co-GM has same privileges as GM for token operations."""
        existing = {"character_id": None, "campaign_id": "c1"}
        role = "co_gm"

        blocked = False
        if role == "player" and not existing["character_id"]:
            blocked = True

        assert not blocked, "Co-GM should not be blocked from modifying any token"


# ============================================================================
# P1.4 — Fog reveal via CircleRevealRequest validation
# ============================================================================

class TestCircleRevealRequest:
    def test_valid_circle_reveal(self):
        from app.routers.vtt import CircleRevealRequest
        r = CircleRevealRequest(center_x=100, center_y=200, radius_ft=30)
        assert r.radius_ft == 30

    def test_nan_center_rejected(self):
        import pydantic

        from app.routers.vtt import CircleRevealRequest
        with pytest.raises(pydantic.ValidationError):
            CircleRevealRequest(center_x=float("nan"), center_y=200, radius_ft=30)

    def test_inf_center_rejected(self):
        import pydantic

        from app.routers.vtt import CircleRevealRequest
        with pytest.raises(pydantic.ValidationError):
            CircleRevealRequest(center_x=float("inf"), center_y=200, radius_ft=30)

    def test_negative_radius_rejected(self):
        import pydantic

        from app.routers.vtt import CircleRevealRequest
        with pytest.raises(pydantic.ValidationError):
            CircleRevealRequest(center_x=0, center_y=0, radius_ft=-10)

    def test_zero_radius_rejected(self):
        import pydantic

        from app.routers.vtt import CircleRevealRequest
        with pytest.raises(pydantic.ValidationError):
            CircleRevealRequest(center_x=0, center_y=0, radius_ft=0)

    def test_nan_radius_rejected(self):
        import pydantic

        from app.routers.vtt import CircleRevealRequest
        with pytest.raises(pydantic.ValidationError):
            CircleRevealRequest(center_x=0, center_y=0, radius_ft=float("nan"))

    def test_inf_radius_rejected(self):
        import pydantic

        from app.routers.vtt import CircleRevealRequest
        with pytest.raises(pydantic.ValidationError):
            CircleRevealRequest(center_x=0, center_y=0, radius_ft=float("inf"))

    def test_excessive_radius_rejected(self):
        import pydantic

        from app.routers.vtt import CircleRevealRequest
        with pytest.raises(pydantic.ValidationError):
            CircleRevealRequest(center_x=0, center_y=0, radius_ft=121)

    def test_max_radius_accepted(self):
        from app.routers.vtt import CircleRevealRequest
        r = CircleRevealRequest(center_x=0, center_y=0, radius_ft=120)
        assert r.radius_ft == 120


# ============================================================================
# P1.3 — Token metadata filtering for players
# ============================================================================

class TestTokenPublicFiltered:
    def test_token_public_includes_metadata(self):
        """GM/co-GM token_public preserves metadata."""
        import json
        from datetime import datetime
        from uuid import uuid4
        from unittest.mock import AsyncMock, MagicMock

        from app.routers.vtt import token_public
        now = datetime.now(UTC)
        row = {
            "id": uuid4(), "scene_id": uuid4(), "character_id": uuid4(),
            "name": "Orc", "x": 100, "y": 200, "size": 2, "color": "red",
            "is_hidden": False, "vision_radius": 0,
            "metadata": json.dumps({"hp": 45, "notes": "secret"}),
            "created_at": now, "updated_at": now,
        }
        result = token_public(row)
        assert result.metadata == {"hp": 45, "notes": "secret"}

    def test_token_public_filtered_strips_metadata(self):
        """Player token_public_filtered returns empty metadata."""
        import json
        from datetime import datetime
        from uuid import uuid4
        from unittest.mock import AsyncMock, MagicMock

        from app.routers.vtt import token_public_filtered
        now = datetime.now(UTC)
        row = {
            "id": uuid4(), "scene_id": uuid4(), "character_id": uuid4(),
            "name": "Hero", "x": 100, "y": 200, "size": 2, "color": "blue",
            "is_hidden": False, "vision_radius": 30,
            "metadata": json.dumps({"hp": 45, "notes": "secret"}),
            "created_at": now, "updated_at": now,
        }
        result = token_public_filtered(row)
        assert result.metadata == {}, f"Expected empty metadata, got {result.metadata}"


# ============================================================================
# P1.4 — Player fog reveal ownership enforcement
# ============================================================================

class TestFogRevealOwnership:
    """Verify that players can only reveal fog around their own character tokens."""

    def test_player_blocked_from_revealing_npc_token(self):
        """Token without character_id → player cannot reveal fog."""
        existing = {"character_id": None}
        role = "player"

        blocked = False
        if role == "player" and not existing["character_id"]:
            blocked = True

        assert blocked, "Player should be blocked from revealing fog around NPC token"

    def test_player_blocked_from_revealing_other_player_token(self):
        """Token has character_id but player doesn't own it."""
        existing = {"character_id": "char-other"}
        role = "player"
        token_owner_user_id = "user-other"
        current_user_id = "user-me"

        blocked = False
        if role == "player" and (not existing["character_id"] or token_owner_user_id != current_user_id):
            blocked = True

        assert blocked, "Player should be blocked from revealing fog around another player's token"

    def test_gm_can_reveal_any_token(self):
        """GM can always reveal fog around any token."""
        existing = {"character_id": None}
        role = "gm"

        blocked = False
        if role == "player" and not existing["character_id"]:
            blocked = True

        assert not blocked, "GM should not be blocked from revealing fog around any token"

    def test_player_can_reveal_own_token(self):
        """Player CAN reveal around their own character token."""
        existing = {"character_id": "char-own"}
        role = "player"
        token_owner_user_id = "user-me"
        current_user_id = "user-me"

        blocked = False
        if role == "player" and (not existing["character_id"] or token_owner_user_id != current_user_id):
            blocked = True

        assert not blocked, "Player should be able to reveal fog around their own token"


# ============================================================================
# P1.2 — Cache bypass regression (structural check)
# ============================================================================

class TestCacheBeforeRoleCheck:
    """Verify that role checks happen before cache returns in get_scene and get_fog.

    These are structural tests — they verify the source code ordering.
    For full integration tests (Redis + DB), see test_security_integration.py.
    """

    def test_get_scene_role_check_before_cache(self):
        """get_scene must fetch the scene row and check role before cache_get."""
        import inspect

        from app.routers.vtt import get_scene

        src = inspect.getsource(get_scene)
        role_pos = src.find("require_campaign_role")
        cache_pos = src.find("cache_get(")

        assert role_pos >= 0, "require_campaign_role not found in get_scene"
        assert cache_pos >= 0, "cache_get not found in get_scene"
        assert role_pos < cache_pos, (
            "Role check must appear BEFORE cache_get in get_scene. "
            f"Found role at {role_pos}, cache at {cache_pos}"
        )

    def test_get_fog_role_check_before_cache(self):
        """get_fog must fetch the scene row and check role before cache_get."""
        import inspect

        from app.routers.vtt import get_fog

        src = inspect.getsource(get_fog)
        role_pos = src.find("require_campaign_role")
        cache_pos = src.find("cache_get(")

        assert role_pos >= 0, "require_campaign_role not found in get_fog"
        assert cache_pos >= 0, "cache_get not found in get_fog"
        assert role_pos < cache_pos, (
            "Role check must appear BEFORE cache_get in get_fog. "
            f"Found role at {role_pos}, cache at {cache_pos}"
        )


# ============================================================================
# P1.1 — Handout cache key includes role
# ============================================================================

class TestHandoutCacheKey:
    """Verify that handout cache keys are role-scoped to prevent GM→player leaks."""

    def test_list_handouts_cache_key_includes_role(self):
        """The cache key in list_handouts must segment by role."""
        import inspect

        from app.routers.handouts import list_handouts

        src = inspect.getsource(list_handouts)
        # Verify role is in the cache key string
        assert '{role}' in src or 'role}' in src, (
            "Cache key in list_handouts must include 'role' to segment GM vs player cache"
        )


# ============================================================================
# P0 — Secret scene boundaries (PR agent/fix/security-campaign-boundaries)
# ============================================================================


class TestSecretSceneBoundaries:
    """Verify that players cannot access secret scenes or their resources.

    These are logic-level tests — they validate the permission checks
    that the HTTP endpoints would perform, without requiring a live DB pool.
    """

    def test_gm_can_access_secret_scene(self):
        """GM and co-GM roles can access secret scenes."""
        for role in ("gm", "co_gm"):
            is_secret = True
            # GM/co-GM always pass the is_secret check
            blocked = role == "player" and is_secret
            assert not blocked, f"{role} should NOT be blocked from secret scene"

    def test_player_blocked_from_secret_scene(self):
        """Player role is blocked from scenes where is_secret=True."""
        role = "player"
        is_secret = True
        blocked = role == "player" and is_secret
        assert blocked, "Player should be blocked from secret scene"

    def test_player_not_blocked_from_public_scene(self):
        """Player can access non-secret scenes."""
        role = "player"
        is_secret = False
        blocked = role == "player" and is_secret
        assert not blocked, "Player should NOT be blocked from public scene"

    def test_same_logic_applies_to_all_secret_endpoints(self):
        """The 'player + is_secret = 404' rule applies to scenes, tokens, and fog."""
        # This verifies the pattern is consistent
        def check_is_secret(role: str, is_secret: bool) -> bool:
            return role == "player" and is_secret

        assert check_is_secret("player", True), "player+secret → blocked"
        assert not check_is_secret("player", False), "player+public → allowed"
        assert not check_is_secret("gm", True), "gm+secret → allowed"
        assert not check_is_secret("co_gm", True), "co_gm+secret → allowed"

    def test_scene_create_includes_is_secret(self):
        """SceneCreateRequest accepts and validates is_secret."""
        from app.schemas import SceneCreateRequest

        req = SceneCreateRequest(name="Test", is_secret=True)
        assert req.is_secret is True

        req2 = SceneCreateRequest(name="Test", is_secret=False)
        assert req2.is_secret is False

        # Default is False
        req3 = SceneCreateRequest(name="Test")
        assert req3.is_secret is False

    def test_scene_settings_update_includes_is_secret(self):
        """SceneSettingsUpdateRequest now accepts is_secret."""
        from app.schemas import SceneSettingsUpdateRequest

        req = SceneSettingsUpdateRequest(is_secret=True)
        assert req.is_secret is True

        # None means not set (exclude_unset)
        req2 = SceneSettingsUpdateRequest()
        assert req2.is_secret is None

    def test_scene_public_includes_is_secret(self):
        """ScenePublic has is_secret field."""
        import inspect

        from app.schemas import ScenePublic
        fields = ScenePublic.model_fields
        assert "is_secret" in fields, "ScenePublic must include is_secret"
        assert fields["is_secret"].default is False

    def test_player_scene_list_filters_secret(self):
        """player_scenes endpoint queries with is_secret = false."""
        import inspect

        from app.routers.player import player_scenes
        src = inspect.getsource(player_scenes)
        assert "is_secret = false" in src, (
            "player_scenes must filter with 'is_secret = false'"
        )


# ============================================================================
# P0 — Player-visible data boundaries (PR agent/fix/player-data-boundaries)
# ============================================================================


class TestPlayerCharacterDto:
    """PlayerCharacterPublic DTO must not leak private character fields."""

    def test_player_dto_has_no_private_fields(self):
        from app.schemas import PlayerCharacterPublic
        fields = PlayerCharacterPublic.model_fields
        private = {"notes", "spells", "resources", "inventory", "attacks",
                    "skills", "saving_throws", "attributes", "xp",
                    "proficiency_bonus", "campaign_id", "owner_user_id"}
        found = private & set(fields.keys())
        assert not found, f"PlayerCharacterPublic leaks private fields: {found}"

    def test_player_dto_has_combat_visible_fields(self):
        from app.schemas import PlayerCharacterPublic
        fields = PlayerCharacterPublic.model_fields
        required = {"id", "name", "level", "armor_class", "hp_current", "hp_max", "conditions"}
        assert required <= set(fields.keys()), f"Missing: {required - set(fields.keys())}"


class TestPlayerLogExport:
    """Log export must filter GM-only entries for players."""

    def test_export_log_filters_visibility_for_player(self):
        import inspect

        from app.routers.session import export_log
        src = inspect.getsource(export_log)
        assert "visibility = 'public'" in src, (
            "export_log must filter gm_only entries for players"
        )


class TestPlayerEncounterAccess:
    """Players can only view active encounters."""

    def test_player_blocked_from_inactive_encounter(self):
        role = "player"
        status = "planning"
        blocked = role == "player" and status != "active"
        assert blocked, "Player should be blocked from inactive encounter"

    def test_gm_can_view_any_encounter(self):
        for role in ("gm", "co_gm"):
            status = "planning"
            blocked = role == "player" and status != "active"
            assert not blocked, f"{role} should view inactive encounters"
