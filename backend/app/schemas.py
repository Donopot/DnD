from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str
    created_at: datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=200)


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
    campaign_id: UUID
    owner_user_id: UUID | None
    created_at: datetime
    updated_at: datetime


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
    created_at: datetime


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
    conditions: list[str] = Field(default_factory=list)
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
    conditions: list[str] | None = None
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
    conditions: list[str]
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
