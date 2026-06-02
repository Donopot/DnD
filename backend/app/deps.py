from uuid import UUID

from asyncpg import Record
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.security import HTTPBearer

from app.db import get_pool
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Record:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
        )

    user_id = decode_access_token(credentials.credentials)
    row = await get_pool().fetchrow(
        """
        select id, email, display_name, account_type, created_at
        from users
        where id = $1
        """,
        user_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable",
        )
    return row


async def require_campaign_role(campaign_id: UUID, user_id: UUID, roles: set[str]) -> str:
    row = await get_pool().fetchrow(
        """
        select role
        from campaign_members
        where campaign_id = $1 and user_id = $2
        """,
        campaign_id,
        user_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campagne introuvable")
    if row["role"] not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rôle insuffisant")
    return row["role"]


async def require_gm_account(current_user=Depends(get_current_user)) -> Record:
    """Block player-only accounts from GM actions (e.g. creating campaigns)."""
    if current_user.get("account_type") == "player":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un compte MJ peut effectuer cette action. Créez un compte MJ.",
        )
    return current_user
