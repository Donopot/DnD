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
        created_at=row["created_at"],
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest) -> AuthResponse:
    try:
        row = await get_pool().fetchrow(
            """
            insert into users (email, display_name, password_hash)
            values ($1, $2, $3)
            returning id, email, display_name, created_at
            """,
            payload.email.lower(),
            payload.display_name.strip(),
            hash_password(payload.password),
        )
    except UniqueViolationError as exc:
        raise HTTPException(status_code=409, detail="Email already registered") from exc

    return AuthResponse(access_token=create_access_token(row["id"]), user=user_public(row))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest) -> AuthResponse:
    row = await get_pool().fetchrow(
        """
        select id, email, display_name, password_hash, created_at
        from users
        where lower(email) = lower($1)
        """,
        payload.email,
    )
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return AuthResponse(access_token=create_access_token(row["id"]), user=user_public(row))


@router.get("/me", response_model=UserPublic)
async def me(current_user=Depends(get_current_user)) -> UserPublic:
    return user_public(current_user)
