from datetime import UTC
from datetime import datetime

from asyncpg import ForeignKeyViolationError
from asyncpg import UniqueViolationError
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi import status

from app.db import get_pool
from app.deps import get_current_user
from app.limiter import shared_limiter
from app.schemas import AuthResponse
from app.schemas import LoginRequest
from app.schemas import RegisterRequest
from app.schemas import UserPublic
from app.security import create_access_token
from app.security import hash_password
from app.security import verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def user_public(row) -> UserPublic:
    return UserPublic(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        account_type=row["account_type"],
        created_at=row["created_at"],
    )


# ── Register (GM or Player) ──────────────────────────────────────────────

async def _validate_player_invite(connection, invite_token: str | None):
    """If the user registers as a player, validate the invite token and return campaign info.

    Must be called within an active transaction on `connection` to hold the FOR UPDATE lock."""
    if invite_token is None:
        raise HTTPException(
            status_code=400,
            detail="Un token d'invitation est requis pour créer un compte Joueur",
        )

    row = await connection.fetchrow(
        """
        select ci.campaign_id, ci.role, ci.expires_at, ci.max_uses, ci.use_count, ci.revoked_at
        from campaign_invites ci
        where ci.token = $1
        for update
        """,
        invite_token,
    )

    if row is None or row["revoked_at"] is not None:
        raise HTTPException(status_code=404, detail="Invitation introuvable ou révoquée")
    if row["expires_at"] is not None and row["expires_at"] < datetime.now(UTC):
        raise HTTPException(status_code=410, detail="Invitation expirée")
    if row["max_uses"] is not None and row["use_count"] >= row["max_uses"]:
        raise HTTPException(status_code=410, detail="Invitation épuisée")

    return row["campaign_id"], row["role"]


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@shared_limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest) -> AuthResponse:
    # Honeypot anti-bot — si le champ caché est rempli, rejeter silencieusement
    if payload.website:
        raise HTTPException(status_code=400, detail="Requête invalide")

    # Player registration requires a valid invite token
    campaign_id = None
    invite_role = None

    async with get_pool().acquire() as connection, connection.transaction():
        if payload.account_type == "player":
            campaign_id, invite_role = await _validate_player_invite(connection, payload.invite_token)

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
        except ForeignKeyViolationError:
            raise HTTPException(status_code=410, detail="La campagne n'existe plus ou a été supprimée") from None
        except Exception:
            raise HTTPException(status_code=500, detail="Erreur interne lors de l'inscription") from None

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
@shared_limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest) -> AuthResponse:
    row = await get_pool().fetchrow(
        """
        select id, email, display_name, password_hash, account_type, created_at
        from users
        where lower(email) = lower($1)
        """,
        payload.email,
    )
    # Constant-time comparison: always call verify_password even if user not found
    # to prevent user enumeration via timing attack
    stored_hash = row["password_hash"] if row is not None else \
        "$2b$12$" + "0" * 53  # dummy bcrypt hash that will never match
    if row is None or not verify_password(payload.password, stored_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    return AuthResponse(access_token=create_access_token(row["id"]), user=user_public(row))


# ── Me ────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
@shared_limiter.limit("60/minute")
async def me(request: Request, current_user=Depends(get_current_user)) -> UserPublic:
    return user_public(current_user)
