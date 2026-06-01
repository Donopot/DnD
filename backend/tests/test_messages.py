"""Tests for Phase 21: Communication MJ↔Joueur."""

from uuid import UUID

import pytest

FIXED = UUID("00000000-0000-0000-0000-000000000001")


class TestGmMessageSchemas:
    """Validation des schémas de messages."""

    def test_message_create_valid(self):
        from app.schemas import GmMessageCreate
        msg = GmMessageCreate(recipient_id=FIXED, content="Hello player!")
        assert msg.content == "Hello player!"

    def test_message_create_empty_content_rejected(self):
        from app.schemas import GmMessageCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            GmMessageCreate(recipient_id=FIXED, content="")

    def test_announcement_create_valid(self):
        from app.schemas import GmAnnouncementCreate
        ann = GmAnnouncementCreate(content="Boss fight tonight!")
        assert ann.content == "Boss fight tonight!"

    def test_announcement_create_too_long_rejected(self):
        from app.schemas import GmAnnouncementCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            GmAnnouncementCreate(content="x" * 2000)

    def test_secret_roll_create(self):
        from app.schemas import GmSecretRollCreate
        roll = GmSecretRollCreate(formula="2d6+3", label="Piège")
        assert roll.formula == "2d6+3"
        assert roll.label == "Piège"

    def test_secret_roll_default_label(self):
        from app.schemas import GmSecretRollCreate
        roll = GmSecretRollCreate(formula="1d20")
        assert roll.label == "Jet secret"

    def test_message_public_shape(self):
        from datetime import datetime, timezone
        from app.schemas import GmMessagePublic
        msg = GmMessagePublic(
            id=FIXED,
            campaign_id=FIXED,
            sender_id=FIXED,
            recipient_id=FIXED,
            content="Hello",
            kind="message",
            created_at=datetime.now(timezone.utc),
        )
        assert msg.kind == "message"
        assert msg.read_at is None
