from datetime import datetime
from typing import Any
from uuid import UUID

import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str
    account_type: str = "gm"
    created_at: datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=200)
    confirm_password: str = Field(min_length=8, max_length=200)
    account_type: str = Field(default="gm", pattern="^(gm|player)$")
    invite_token: str | None = Field(default=None, max_length=64)
    # Honeypot anti-bot — les bots remplissent ce champ caché
    website: str = Field(default="")

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not re.search(r"[a-z]", v):
            raise ValueError("Le mot de passe doit contenir au moins une minuscule")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule")
        if not re.search(r"\d", v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Les mots de passe ne correspondent pas")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class CampaignCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)


class CampaignPublic(BaseModel):
    id: UUID
    owner_user_id: UUID
    name: str
    description: str
    role: str
    member_count: int
    created_at: datetime
    updated_at: datetime


class CampaignMemberPublic(BaseModel):
    user_id: UUID
    email: EmailStr
    display_name: str
    role: str
    joined_at: datetime


class InviteCreateRequest(BaseModel):
    role: str = Field(default="player", pattern="^(player|co_gm)$")
    max_uses: int | None = Field(default=None, ge=1, le=100)
    expires_in_days: int | None = Field(default=14, ge=1, le=365)


class InvitePublic(BaseModel):
    token: str
    campaign_id: UUID
    role: str
    expires_at: datetime | None
    max_uses: int | None
    use_count: int
    created_at: datetime


class InvitePreview(BaseModel):
    token: str
    campaign_id: UUID
    campaign_name: str
    role: str
    expires_at: datetime | None
    remaining_uses: int | None


class CharacterBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    ancestry: str = Field(default="", max_length=80)
    class_name: str = Field(default="", max_length=80)
    level: int = Field(default=1, ge=1, le=20)
    armor_class: int = Field(default=10, ge=1, le=40)
    speed: int = Field(default=30, ge=0, le=200)
    proficiency_bonus: int = Field(default=2, ge=2, le=8)
    hp_current: int = Field(default=1, ge=0)
    hp_max: int = Field(default=1, ge=1)
    attributes: dict[str, int] = Field(
        default_factory=lambda: {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10}
    )
    skills: dict[str, Any] = Field(default_factory=dict)
    saving_throws: dict[str, Any] = Field(default_factory=dict)
    attacks: list[dict[str, Any]] = Field(default_factory=list)
    inventory: list[dict[str, Any]] = Field(default_factory=list)
    spells: list[dict[str, Any]] = Field(default_factory=list)
    resources: list[dict[str, Any]] = Field(default_factory=list)
    notes: str = Field(default="", max_length=4000)


class CharacterCreateRequest(CharacterBase):
    owner_user_id: UUID | None = None


class CharacterUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    ancestry: str | None = Field(default=None, max_length=80)
    class_name: str | None = Field(default=None, max_length=80)
    level: int | None = Field(default=None, ge=1, le=20)
    armor_class: int | None = Field(default=None, ge=1, le=40)
    speed: int | None = Field(default=None, ge=0, le=200)
    proficiency_bonus: int | None = Field(default=None, ge=2, le=8)
    hp_current: int | None = Field(default=None, ge=0)
    hp_max: int | None = Field(default=None, ge=1)
    attributes: dict[str, int] | None = None
    skills: dict[str, Any] | None = None
    saving_throws: dict[str, Any] | None = None
    attacks: list[dict[str, Any]] | None = None
    inventory: list[dict[str, Any]] | None = None
    spells: list[dict[str, Any]] | None = None
    resources: list[dict[str, Any]] | None = None
    notes: str | None = Field(default=None, max_length=4000)


class CharacterPublic(CharacterBase):
    id: UUID
    campaign_id: UUID | None  # NULL = vault personnel
    owner_user_id: UUID
    status: str = "active"  # personal | submitted | active | archived
    submitted_to_campaign_id: UUID | None = None
    xp: int = 0
    conditions: list[dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime


class CharacterSubmitRequest(BaseModel):
    campaign_id: UUID


class CharacterApproveRequest(BaseModel):
    approved: bool = True  # True = approve, False = reject


class RollCreateRequest(BaseModel):
    formula: str = Field(min_length=1, max_length=80)
    label: str = Field(default="", max_length=120)
    mode: str = Field(default="normal", pattern="^(normal|advantage|disadvantage)$")
    visibility: str = Field(default="public", pattern="^(public|gm)$")
    character_id: UUID | None = None


class RollPublic(BaseModel):
    id: UUID
    campaign_id: UUID
    user_id: UUID
    character_id: UUID | None
    visibility: str
    label: str
    formula: str
    mode: str
    total: int
    detail: dict[str, Any]
    created_at: datetime


class GameLogNoteRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    visibility: str = Field(default="public", pattern="^(public|gm)$")


class GameLogEntryPublic(BaseModel):
    id: UUID
    campaign_id: UUID
    user_id: UUID | None
    character_id: UUID | None
    entry_type: str
    visibility: str
    message: str
    payload: dict[str, Any]
    category: str = "general"
    linked_scene_id: UUID | None = None
    linked_encounter_id: UUID | None = None
    linked_character_id: UUID | None = None
    pinned: bool = False
    session_marker: bool = False
    created_at: datetime


class SessionMarkerRequest(BaseModel):
    label: str = Field(default="", max_length=200)


class LogExportRequest(BaseModel):
    format: str = Field(default="markdown", pattern="^(markdown|json)$")
    category: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None


class SceneCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    grid_size: int = Field(default=50, ge=16, le=200)
    width: int = Field(default=1600, ge=200, le=10000)
    height: int = Field(default=1000, ge=200, le=10000)
    background_url: str | None = Field(default=None, max_length=2000)
    is_active: bool = False


class ScenePublic(BaseModel):
    id: UUID
    campaign_id: UUID
    name: str
    description: str
    grid_size: int
    width: int
    height: int
    background_url: str | None
    background_asset_id: UUID | None = None
    is_active: bool
    snap_to_grid: bool = True
    view_zoom: float = 1.0
    view_pan_x: int = 0
    view_pan_y: int = 0
    created_at: datetime
    updated_at: datetime


class TokenCreateRequest(BaseModel):
    character_id: UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    x: int = Field(default=0, ge=0, le=10000)
    y: int = Field(default=0, ge=0, le=10000)
    size: int = Field(default=1, ge=1, le=8)
    color: str = Field(default="#7c3aed", max_length=32)
    is_hidden: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class TokenUpdateRequest(BaseModel):
    character_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    x: int | None = Field(default=None, ge=0, le=10000)
    y: int | None = Field(default=None, ge=0, le=10000)
    size: int | None = Field(default=None, ge=1, le=8)
    color: str | None = Field(default=None, max_length=32)
    is_hidden: bool | None = None
    metadata: dict[str, Any] | None = None


class TokenPublic(BaseModel):
    id: UUID
    scene_id: UUID
    character_id: UUID | None
    name: str
    x: int
    y: int
    size: int
    color: str
    is_hidden: bool
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class EncounterCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    scene_id: UUID | None = None


class EncounterPublic(BaseModel):
    id: UUID
    campaign_id: UUID
    scene_id: UUID | None
    name: str
    status: str
    round_number: int
    turn_index: int
    active_combatant_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class CombatantCreateRequest(BaseModel):
    token_id: UUID | None = None
    character_id: UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    initiative: int = Field(default=0, ge=-20, le=60)
    armor_class: int | None = Field(default=None, ge=1, le=40)
    hp_current: int | None = Field(default=None, ge=0)
    hp_max: int | None = Field(default=None, ge=0)
    conditions: list = Field(default_factory=list)
    notes: str = Field(default="", max_length=2000)
    is_player_controlled: bool = False
    is_hidden: bool = False


class CombatantUpdateRequest(BaseModel):
    token_id: UUID | None = None
    character_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    initiative: int | None = Field(default=None, ge=-20, le=60)
    armor_class: int | None = Field(default=None, ge=1, le=40)
    hp_current: int | None = Field(default=None, ge=0)
    hp_max: int | None = Field(default=None, ge=0)
    conditions: list | None = None
    notes: str | None = Field(default=None, max_length=2000)
    is_player_controlled: bool | None = None
    is_hidden: bool | None = None
    is_defeated: bool | None = None


class CombatantPublic(BaseModel):
    id: UUID
    encounter_id: UUID
    token_id: UUID | None
    character_id: UUID | None
    name: str
    initiative: int
    armor_class: int | None
    hp_current: int | None
    hp_max: int | None
    conditions: list
    notes: str
    is_player_controlled: bool
    is_hidden: bool
    is_defeated: bool
    created_at: datetime
    updated_at: datetime


class EncounterDetailPublic(EncounterPublic):
    combatants: list[CombatantPublic]


class GMNoteCreateRequest(BaseModel):
    scene_id: UUID | None = None
    token_id: UUID | None = None
    title: str = Field(default="", max_length=120)
    content: str = Field(default="", max_length=10000)
    visibility: str = Field(default="gm_team", pattern="^(gm_team|author_only)$")


class GMNoteUpdateRequest(BaseModel):
    scene_id: UUID | None = None
    token_id: UUID | None = None
    title: str | None = Field(default=None, max_length=120)
    content: str | None = Field(default=None, max_length=10000)
    visibility: str | None = Field(default=None, pattern="^(gm_team|author_only)$")


class GMNotePublic(BaseModel):
    id: UUID
    campaign_id: UUID
    scene_id: UUID | None
    token_id: UUID | None
    author_user_id: UUID | None
    title: str
    content: str
    visibility: str
    version: int
    created_at: datetime
    updated_at: datetime

class AssetPublic(BaseModel):
    id: UUID
    campaign_id: UUID
    uploader_user_id: UUID | None
    name: str
    object_key: str
    content_type: str
    size_bytes: int
    asset_type: str
    content_url: str
    created_at: datetime


class SceneBackgroundUpdateRequest(BaseModel):
    asset_id: UUID | None = None


class TokenMoveRequest(BaseModel):
    x: int = Field(ge=0, le=10000)
    y: int = Field(ge=0, le=10000)


class SceneSettingsUpdateRequest(BaseModel):
    snap_to_grid: bool | None = None
    grid_size: int | None = Field(default=None, ge=16, le=200)
    width: int | None = Field(default=None, ge=200, le=10000)
    height: int | None = Field(default=None, ge=200, le=10000)
    view_zoom: float | None = Field(default=None, ge=0.1, le=5.0)
    view_pan_x: int | None = Field(default=None, ge=-10000, le=10000)
    view_pan_y: int | None = Field(default=None, ge=-10000, le=10000)


class HandoutCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="", max_length=50000)
    visibility: str = Field(default="gm", pattern="^(public|players|gm|gm_team)$")
    asset_id: UUID | None = None
    scene_id: UUID | None = None


class HandoutUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=50000)
    visibility: str | None = Field(default=None, pattern="^(public|players|gm|gm_team)$")
    asset_id: UUID | None = None
    scene_id: UUID | None = None
    is_revealed: bool | None = None


class HandoutPublic(BaseModel):
    id: UUID
    campaign_id: UUID
    author_user_id: UUID
    title: str
    content: str
    visibility: str
    asset_id: UUID | None
    scene_id: UUID | None
    is_revealed: bool
    revealed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ConditionDetail(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    duration: int | None = Field(default=None, ge=1, le=1000)
    duration_unit: str | None = Field(default=None, pattern="^(rounds|minutes|hours)$")
    source: str | None = Field(default=None, max_length=200)
    is_concentration: bool = False


class ApplyConditionRequest(BaseModel):
    combatant_id: UUID
    condition: ConditionDetail


class RemoveConditionRequest(BaseModel):
    combatant_id: UUID
    condition_name: str = Field(min_length=1, max_length=80)


class CombatLogEntryPublic(BaseModel):
    id: UUID
    encounter_id: UUID
    campaign_id: UUID
    combatant_id: UUID | None
    actor_user_id: UUID | None
    event_type: str
    payload: dict[str, Any]
    created_at: datetime


class BulkInitiativeRequest(BaseModel):
    combatant_ids: list[UUID] | None = None


class EncounterFromSceneRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class HomebrewCreatureCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=4000)
    armor_class: int = Field(default=10, ge=1, le=40)
    hp_max: int = Field(default=1, ge=1)
    speed: int = Field(default=30, ge=0, le=200)
    attributes: dict[str, int] = Field(default_factory=lambda: {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10})
    attacks: list[dict[str, Any]] = Field(default_factory=list)
    spells: list[dict[str, Any]] = Field(default_factory=list)
    size: str = Field(default="medium", pattern="^(tiny|small|medium|large|huge|gargantuan)$")
    challenge_rating: float = Field(default=0, ge=0, le=30)
    type: str = Field(default="monster", max_length=40)


class HomebrewCreatureUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    armor_class: int | None = Field(default=None, ge=1, le=40)
    hp_max: int | None = Field(default=None, ge=1)
    speed: int | None = Field(default=None, ge=0, le=200)
    attributes: dict[str, int] | None = None
    attacks: list[dict[str, Any]] | None = None
    spells: list[dict[str, Any]] | None = None
    size: str | None = Field(default=None, pattern="^(tiny|small|medium|large|huge|gargantuan)$")
    challenge_rating: float | None = Field(default=None, ge=0, le=30)
    type: str | None = Field(default=None, max_length=40)


class HomebrewCreaturePublic(BaseModel):
    id: UUID
    campaign_id: UUID
    name: str
    description: str
    armor_class: int
    hp_max: int
    speed: int
    attributes: dict[str, int]
    attacks: list[dict[str, Any]]
    spells: list[dict[str, Any]]
    size: str
    challenge_rating: float
    type: str
    created_at: datetime
    updated_at: datetime


class HomebrewItemCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=4000)
    item_type: str = Field(default="misc", max_length=60)
    rarity: str = Field(default="common", pattern="^(common|uncommon|rare|very_rare|legendary)$")
    properties: dict[str, Any] = Field(default_factory=dict)


class HomebrewItemUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    item_type: str | None = Field(default=None, max_length=60)
    rarity: str | None = Field(default=None, pattern="^(common|uncommon|rare|very_rare|legendary)$")
    properties: dict[str, Any] | None = None


class HomebrewItemPublic(BaseModel):
    id: UUID
    campaign_id: UUID
    name: str
    description: str
    item_type: str
    rarity: str
    properties: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class CreatureToTokenRequest(BaseModel):
    scene_id: UUID
    x: int = Field(default=0, ge=0, le=10000)
    y: int = Field(default=0, ge=0, le=10000)


class CreatureToCombatantRequest(BaseModel):
    encounter_id: UUID
    initiative: int = Field(default=0, ge=-20, le=60)


class PlayerEncounterPublic(BaseModel):
    """Safe encounter view for players — hides sensitive combatant data."""
    id: UUID
    name: str
    status: str
    round_number: int
    turn_index: int
    combatants: list[dict[str, Any]]


# ── Phase 21: Communication MJ↔Joueur ────────────────────────────────────

class GmMessageCreate(BaseModel):
    """Send a private message to a specific player."""
    recipient_id: UUID
    content: str = Field(min_length=1, max_length=2000)


class GmAnnouncementCreate(BaseModel):
    """Broadcast an announcement to all players in the campaign."""
    content: str = Field(min_length=1, max_length=1000)


class GmSecretRollCreate(BaseModel):
    """GM rolls dice secretly — only GM sees the result unless shared."""
    recipient_id: UUID | None = None  # null = GM-only, set = share with one player
    formula: str = Field(min_length=1, max_length=100)
    label: str = Field(default="Jet secret", max_length=200)


class GmMessagePublic(BaseModel):
    id: UUID
    campaign_id: UUID
    sender_id: UUID
    recipient_id: UUID | None
    content: str
    kind: str
    roll_data: dict[str, Any] | None = None
    read_at: datetime | None = None
    created_at: datetime


# ── Phase 23: Character Management (GM) ─────────────────────────────────────

class XpUpdateRequest(BaseModel):
    """Add XP to a character. GM only."""
    amount: int = Field(ge=0, le=999999)
    note: str = Field(default="", max_length=200)


class ConditionsUpdateRequest(BaseModel):
    """Set active conditions on a character. GM only."""
    conditions: list[dict[str, Any]] = Field(default_factory=list)


class HpAdjustRequest(BaseModel):
    """Adjust HP (positive=heal, negative=damage). GM only."""
    amount: int
    note: str = Field(default="", max_length=200)


class InventoryItemRequest(BaseModel):
    """Add, remove, or update an inventory item. GM only."""
    action: str = Field(pattern="^(add|remove|update)$")
    item: dict[str, Any]
    index: int | None = None  # required for remove/update


class ResourceRequest(BaseModel):
    """Add, remove, or update a resource (spell slots, abilities). GM only."""
    action: str = Field(pattern="^(add|remove|update)$")
    resource: dict[str, Any]
    index: int | None = None  # required for remove/update
