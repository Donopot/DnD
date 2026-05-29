import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_pool
from app.deps import get_current_user, require_campaign_role
from app.schemas import (
    CampaignCreateRequest,
    CampaignMemberPublic,
    CampaignPublic,
    InviteCreateRequest,
    InvitePreview,
    InvitePublic,
)

router = APIRouter(prefix="/api", tags=["campaigns"])


def campaign_public(row) -> CampaignPublic:
    return CampaignPublic(
        id=row["id"],
        owner_user_id=row["owner_user_id"],
        name=row["name"],
        description=row["description"],
        role=row["role"],
        member_count=row["member_count"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/campaigns", response_model=list[CampaignPublic])
async def list_campaigns(current_user=Depends(get_current_user)) -> list[CampaignPublic]:
    rows = await get_pool().fetch(
        """
        select
            c.id,
            c.owner_user_id,
            c.name,
            c.description,
            cm.role,
            c.created_at,
            c.updated_at,
            count(all_members.user_id)::int as member_count
        from campaigns c
        join campaign_members cm on cm.campaign_id = c.id and cm.user_id = $1
        join campaign_members all_members on all_members.campaign_id = c.id
        group by c.id, cm.role
        order by c.updated_at desc
        """,
        current_user["id"],
    )
    return [campaign_public(row) for row in rows]


@router.post("/campaigns", response_model=CampaignPublic, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreateRequest,
    current_user=Depends(get_current_user),
) -> CampaignPublic:
    async with get_pool().acquire() as connection:
        async with connection.transaction():
            campaign = await connection.fetchrow(
                """
                insert into campaigns (owner_user_id, name, description)
                values ($1, $2, $3)
                returning id, owner_user_id, name, description, created_at, updated_at
                """,
                current_user["id"],
                payload.name.strip(),
                payload.description.strip(),
            )
            await connection.execute(
                """
                insert into campaign_members (campaign_id, user_id, role)
                values ($1, $2, 'gm')
                """,
                campaign["id"],
                current_user["id"],
            )

    row = await get_pool().fetchrow(
        """
        select c.*, cm.role, count(all_members.user_id)::int as member_count
        from campaigns c
        join campaign_members cm on cm.campaign_id = c.id and cm.user_id = $2
        join campaign_members all_members on all_members.campaign_id = c.id
        where c.id = $1
        group by c.id, cm.role
        """,
        campaign["id"],
        current_user["id"],
    )
    return campaign_public(row)


@router.get("/campaigns/{campaign_id}", response_model=CampaignPublic)
async def get_campaign(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> CampaignPublic:
    row = await get_pool().fetchrow(
        """
        select c.*, cm.role, count(all_members.user_id)::int as member_count
        from campaigns c
        join campaign_members cm on cm.campaign_id = c.id and cm.user_id = $2
        join campaign_members all_members on all_members.campaign_id = c.id
        where c.id = $1
        group by c.id, cm.role
        """,
        campaign_id,
        current_user["id"],
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign_public(row)


@router.get("/campaigns/{campaign_id}/members", response_model=list[CampaignMemberPublic])
async def list_members(
    campaign_id: UUID,
    current_user=Depends(get_current_user),
) -> list[CampaignMemberPublic]:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm", "player"})
    rows = await get_pool().fetch(
        """
        select u.id as user_id, u.email, u.display_name, cm.role, cm.joined_at
        from campaign_members cm
        join users u on u.id = cm.user_id
        where cm.campaign_id = $1
        order by
          case cm.role when 'gm' then 1 when 'co_gm' then 2 else 3 end,
          cm.joined_at asc
        """,
        campaign_id,
    )
    return [CampaignMemberPublic(**dict(row)) for row in rows]


@router.post("/campaigns/{campaign_id}/invites", response_model=InvitePublic, status_code=201)
async def create_invite(
    campaign_id: UUID,
    payload: InviteCreateRequest,
    current_user=Depends(get_current_user),
) -> InvitePublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    expires_at = None
    if payload.expires_in_days is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)

    row = await get_pool().fetchrow(
        """
        insert into campaign_invites (
            token, campaign_id, created_by_user_id, role, expires_at, max_uses
        )
        values ($1, $2, $3, $4, $5, $6)
        returning token, campaign_id, role, expires_at, max_uses, use_count, created_at
        """,
        secrets.token_urlsafe(32),
        campaign_id,
        current_user["id"],
        payload.role,
        expires_at,
        payload.max_uses,
    )
    return InvitePublic(**dict(row))


@router.get("/invites/{token}", response_model=InvitePreview)
async def preview_invite(token: str) -> InvitePreview:
    row = await get_pool().fetchrow(
        """
        select
            ci.token,
            ci.campaign_id,
            c.name as campaign_name,
            ci.role,
            ci.expires_at,
            ci.max_uses,
            ci.use_count,
            ci.revoked_at
        from campaign_invites ci
        join campaigns c on c.id = ci.campaign_id
        where ci.token = $1
        """,
        token,
    )
    if row is None or row["revoked_at"] is not None:
        raise HTTPException(status_code=404, detail="Invite not found")
    if row["expires_at"] is not None and row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite expired")
    remaining_uses = None
    if row["max_uses"] is not None:
        remaining_uses = max(row["max_uses"] - row["use_count"], 0)
        if remaining_uses == 0:
            raise HTTPException(status_code=410, detail="Invite exhausted")
    return InvitePreview(
        token=row["token"],
        campaign_id=row["campaign_id"],
        campaign_name=row["campaign_name"],
        role=row["role"],
        expires_at=row["expires_at"],
        remaining_uses=remaining_uses,
    )


@router.post("/invites/{token}/join", response_model=CampaignPublic)
async def join_invite(token: str, current_user=Depends(get_current_user)) -> CampaignPublic:
    async with get_pool().acquire() as connection:
        async with connection.transaction():
            invite = await connection.fetchrow(
                """
                select *
                from campaign_invites
                where token = $1
                for update
                """,
                token,
            )
            if invite is None or invite["revoked_at"] is not None:
                raise HTTPException(status_code=404, detail="Invite not found")
            if invite["expires_at"] is not None and invite["expires_at"] < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="Invite expired")
            if invite["max_uses"] is not None and invite["use_count"] >= invite["max_uses"]:
                raise HTTPException(status_code=410, detail="Invite exhausted")

            await connection.execute(
                """
                insert into campaign_members (campaign_id, user_id, role)
                values ($1, $2, $3)
                on conflict (campaign_id, user_id) do nothing
                """,
                invite["campaign_id"],
                current_user["id"],
                invite["role"],
            )
            await connection.execute(
                """
                update campaign_invites
                set use_count = use_count + 1
                where token = $1
                """,
                token,
            )

    row = await get_pool().fetchrow(
        """
        select c.*, cm.role, count(all_members.user_id)::int as member_count
        from campaigns c
        join campaign_members cm on cm.campaign_id = c.id and cm.user_id = $2
        join campaign_members all_members on all_members.campaign_id = c.id
        where c.id = $1
        group by c.id, cm.role
        """,
        invite["campaign_id"],
        current_user["id"],
    )
    return campaign_public(row)

