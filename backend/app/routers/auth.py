from datetime import datetime, timezone

from asyncpg import UniqueViolationError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db import get_pool
from app.deps import get_current_user
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserPublic
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def user_public(row) -> UserPublic:
    return UserPublic(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        account_type=row["account_type"],
        created_at=row["created_at"],
    )


# ── Register (GM or Player) ──────────────────────────────────────────────

async def _validate_player_invite(invite_token: str | None):
    """If the user registers as a player, validate the invite token and return campaign info."""
    if invite_token is None:
        raise HTTPException(
            status_code=400,
            detail="Un token d'invitation est requis pour créer un compte Joueur",
        )

    row = await get_pool().fetchrow(
        """
        select ci.campaign_id, ci.role, ci.expires_at, ci.max_uses, ci.use_count, ci.revoked_at
        from campaign_invites ci
        where ci.token = $1
        """,
        invite_token,
    )

    if row is None or row["revoked_at"] is not None:
        raise HTTPException(status_code=404, detail="Invitation introuvable ou révoquée")
    if row["expires_at"] is not None and row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation expirée")
    if row["max_uses"] is not None and row["use_count"] >= row["max_uses"]:
        raise HTTPException(status_code=410, detail="Invitation épuisée")

    return row["campaign_id"], row["role"]


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest) -> AuthResponse:
    # Honeypot anti-bot — si le champ caché est rempli, rejeter silencieusement
    if payload.website:
        raise HTTPException(status_code=400, detail="Requête invalide")

    # Player registration requires a valid invite token
    campaign_id = None
    invite_role = None

    if payload.account_type == "player":
        campaign_id, invite_role = await _validate_player_invite(payload.invite_token)

    async with get_pool().acquire() as connection:
        async with connection.transaction():
            try:
                row = await connection.fetchrow(
                    """
                    insert into users (email, display_name, password_hash, account_type)
                    values ($1, $2, $3, $4)
                    returning id, email, display_name, account_type, created_at
                    """,
                    payload.email.lower(),
                    payload.display_name.strip(),
                    hash_password(payload.password),
                    payload.account_type,
                )
            except UniqueViolationError as exc:
                raise HTTPException(status_code=409, detail="Cet email est déjà utilisé") from exc

            # Auto-join campaign for player registration
            if campaign_id is not None:
                await connection.execute(
                    """
                    insert into campaign_members (campaign_id, user_id, role)
                    values ($1, $2, $3)
                    on conflict (campaign_id, user_id) do nothing
                    """,
                    campaign_id,
                    row["id"],
                    invite_role,
                )
                await connection.execute(
                    """
                    update campaign_invites
                    set use_count = use_count + 1
                    where token = $1
                    """,
                    payload.invite_token,
                )

    return AuthResponse(access_token=create_access_token(row["id"]), user=user_public(row))


# ── Login ─────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest) -> AuthResponse:
    row = await get_pool().fetchrow(
        """
        select id, email, display_name, password_hash, account_type, created_at
        from users
        where lower(email) = lower($1)
        """,
        payload.email,
    )
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    return AuthResponse(access_token=create_access_token(row["id"]), user=user_public(row))


# ── Me ────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
async def me(current_user=Depends(get_current_user)) -> UserPublic:
    return user_public(current_user)
