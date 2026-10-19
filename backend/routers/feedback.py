"""FastAPI feedback router."""
import time
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from core.dependencies import get_db, get_current_user, require_admin
from db.queries.feedback import (
    create_feedback, get_feedback_by_user, get_all_feedback, respond_to_feedback,
)
from schemas.models import CreateFeedbackRequest, RespondFeedbackRequest

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", status_code=201)
async def submit_feedback(
    body: CreateFeedbackRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    fb_id = f"fb-{int(time.time() * 1000):x}"
    new_fb = await create_feedback(
        conn,
        id=fb_id,
        user_id=current_user["sub"],
        subject=body.subject,
        message=body.message,
    )
    return {"message": "Support ticket submitted successfully", "feedback": dict(new_fb)}


@router.get("")
async def list_feedback(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    if current_user["role"] == "admin":
        rows = await get_all_feedback(conn)
    else:
        rows = await get_feedback_by_user(conn, current_user["sub"])
    return [dict(r) for r in rows]


@router.post("/{feedback_id}/respond")
async def respond_feedback(
    feedback_id: str,
    body: RespondFeedbackRequest,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    await respond_to_feedback(conn, feedback_id, body.admin_response, body.status)
    return {"message": "Response posted and ticket status updated", "id": feedback_id, "status": body.status}
