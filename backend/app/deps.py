from uuid import UUID

from asyncpg import Record
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import get_pool
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Record:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user_id = decode_access_token(credentials.credentials)
    row = await get_pool().fetchrow(
        """
        select id, email, display_name, created_at
        from users
        where id = $1
        """,
        user_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if row["role"] not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
    return row["role"]

