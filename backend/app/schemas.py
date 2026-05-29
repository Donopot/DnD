from datetime import datetime
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

