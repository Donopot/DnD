from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import status

from app.db import get_pool
from app.deps import get_current_user
from app.deps import require_campaign_role
from app.schemas import GMNoteCreateRequest
from app.schemas import GMNotePublic
from app.schemas import GMNoteUpdateRequest

router = APIRouter(prefix="/api", tags=["gm-notes"])


def gm_note_public(row) -> GMNotePublic:
    return GMNotePublic(**dict(row))


async def get_note_or_404(note_id: UUID):
    row = await get_pool().fetchrow(
        """
        select *
        from gm_notes
        where id = $1
        """,
        note_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="GM note not found")
    return row


def ensure_note_visible_to_user(note, user_id: UUID) -> None:
    if note["visibility"] == "author_only" and note["author_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="GM note is private to its author")


async def validate_note_links(campaign_id: UUID, scene_id: UUID | None, token_id: UUID | None) -> None:
    if scene_id is not None:
        scene_exists = await get_pool().fetchval(
            """
            select exists (
                select 1
                from campaign_scenes
                where id = $1 and campaign_id = $2
            )
            """,
            scene_id,
            campaign_id,
        )
        if not scene_exists:
            raise HTTPException(status_code=400, detail="Scene does not belong to this campaign")

    if token_id is not None:
        token_row = await get_pool().fetchrow(
            """
            select st.scene_id, cs.campaign_id
            from scene_tokens st
            join campaign_scenes cs on cs.id = st.scene_id
            where st.id = $1
            """,
            token_id,
        )

        if token_row is None or token_row["campaign_id"] != campaign_id:
            raise HTTPException(status_code=400, detail="Token does not belong to this campaign")

        if scene_id is not None and token_row["scene_id"] != scene_id:
            raise HTTPException(status_code=400, detail="Token does not belong to the selected scene")


@router.get("/campaigns/{campaign_id}/gm-notes", response_model=list[GMNotePublic])
async def list_gm_notes(
    campaign_id: UUID,
    scene_id: UUID | None = Query(default=None),
    token_id: UUID | None = Query(default=None),
    current_user=Depends(get_current_user),
) -> list[GMNotePublic]:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})

    rows = await get_pool().fetch(
        """
        select *
        from gm_notes
        where campaign_id = $1
          and ($2::uuid is null or scene_id = $2)
          and ($3::uuid is null or token_id = $3)
          and (
            visibility = 'gm_team'
            or author_user_id = $4
          )
        order by updated_at desc, created_at desc
        """,
        campaign_id,
        scene_id,
        token_id,
        current_user["id"],
    )

    return [gm_note_public(row) for row in rows]


@router.post("/campaigns/{campaign_id}/gm-notes", response_model=GMNotePublic, status_code=status.HTTP_201_CREATED)
async def create_gm_note(
    campaign_id: UUID,
    payload: GMNoteCreateRequest,
    current_user=Depends(get_current_user),
) -> GMNotePublic:
    await require_campaign_role(campaign_id, current_user["id"], {"gm", "co_gm"})
    await validate_note_links(campaign_id, payload.scene_id, payload.token_id)

    row = await get_pool().fetchrow(
        """
        insert into gm_notes (
            campaign_id,
            scene_id,
            token_id,
            author_user_id,
            title,
            content,
            visibility
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning *
        """,
        campaign_id,
        payload.scene_id,
        payload.token_id,
        current_user["id"],
        payload.title.strip(),
        payload.content,
        payload.visibility,
    )

    return gm_note_public(row)


@router.get("/gm-notes/{note_id}", response_model=GMNotePublic)
async def get_gm_note(
    note_id: UUID,
    current_user=Depends(get_current_user),
) -> GMNotePublic:
    note = await get_note_or_404(note_id)
    await require_campaign_role(note["campaign_id"], current_user["id"], {"gm", "co_gm"})
    ensure_note_visible_to_user(note, current_user["id"])

    return gm_note_public(note)


@router.patch("/gm-notes/{note_id}", response_model=GMNotePublic)
async def update_gm_note(
    note_id: UUID,
    payload: GMNoteUpdateRequest,
    current_user=Depends(get_current_user),
) -> GMNotePublic:
    existing = await get_note_or_404(note_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})
    ensure_note_visible_to_user(existing, current_user["id"])

    current = dict(existing)
    updates = payload.model_dump(exclude_unset=True)

    for key, value in updates.items():
        current[key] = value.strip() if isinstance(value, str) and key == "title" else value

    await validate_note_links(existing["campaign_id"], current["scene_id"], current["token_id"])

    row = await get_pool().fetchrow(
        """
        update gm_notes
        set
            scene_id = $2,
            token_id = $3,
            title = $4,
            content = $5,
            visibility = $6,
            version = version + 1,
            updated_at = now()
        where id = $1
        returning *
        """,
        note_id,
        current["scene_id"],
        current["token_id"],
        current["title"],
        current["content"],
        current["visibility"],
    )

    return gm_note_public(row)


@router.delete("/gm-notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gm_note(
    note_id: UUID,
    current_user=Depends(get_current_user),
) -> None:
    existing = await get_note_or_404(note_id)
    await require_campaign_role(existing["campaign_id"], current_user["id"], {"gm", "co_gm"})
    ensure_note_visible_to_user(existing, current_user["id"])

    await get_pool().execute(
        """
        delete from gm_notes
        where id = $1
        """,
        note_id,
    )
