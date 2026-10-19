"""FastAPI schedule router."""
import time
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from core.dependencies import get_db, get_current_user, require_admin
from db.queries.schedule import (
    get_schedules, create_schedule, update_schedule_status, delete_schedule,
)
from schemas.models import CreateScheduleRequest, UpdateScheduleRequest

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("")
async def list_schedules(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    rows = await get_schedules(conn)
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_schedule_entry(
    body: CreateScheduleRequest,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    sched_id = f"sched-{int(time.time() * 1000):x}"
    new_sched = await create_schedule(
        conn,
        id=sched_id,
        zone_name=body.zone_name,
        waste_type=body.waste_type,
        collection_date=body.collection_date,
        status=body.status,
        created_by=current_user["sub"],
    )
    return {"message": "Collection schedule created", "schedule": dict(new_sched)}


@router.patch("/{schedule_id}")
async def update_schedule(
    schedule_id: str,
    body: UpdateScheduleRequest,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    await update_schedule_status(conn, schedule_id, body.status)
    return {"message": "Schedule status updated successfully", "id": schedule_id, "status": body.status}


@router.delete("/{schedule_id}")
async def delete_schedule_entry(
    schedule_id: str,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    await delete_schedule(conn, schedule_id)
    return {"message": "Schedule entry deleted", "id": schedule_id}
