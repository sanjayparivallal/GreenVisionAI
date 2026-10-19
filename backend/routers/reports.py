"""FastAPI reports router — mirrors Express /reports/* endpoints exactly."""
import time
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
import asyncpg

from core.dependencies import get_db, get_current_user, require_admin
from db.pool import get_pool
from ml.predictor import analyze_waste_image
from db.queries.reports import (
    create_report, get_reports, get_reports_by_user,
    get_report_by_id, update_report_status, approve_report,
    soft_delete_report, hard_delete_report,
)
from db.queries.rewards import create_reward_transaction
from schemas.models import CreateReportRequest, UpdateStatusRequest

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", status_code=201)
async def submit_report(
    body: CreateReportRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    ai_result = await analyze_waste_image(body.image_base64)
    waste_type = ai_result.waste_type
    fill_level = ai_result.fill_level
    severity_score = ai_result.severity_score
    environmental_impact_score = ai_result.environmental_impact_score
    priority_level = ai_result.priority_level
    recommended_action = ai_result.recommended_action
    estimated_waste_kg = ai_result.estimated_waste_kg
    ai_diag = ai_result.model_dump()

    report_id = f"rep-{int(time.time() * 1000):x}"

    pool = get_pool()
    async with pool.acquire() as conn:
        new_report = await create_report(
            conn,
            id=report_id,
            user_id=current_user["sub"],
            image_base64=body.image_base64,
            location_text=body.location_text,
            latitude=body.latitude or 0.0,
            longitude=body.longitude or 0.0,
            waste_type=waste_type,
            fill_level=fill_level,
            severity_score=severity_score,
            environmental_impact_score=environmental_impact_score,
            priority_level=priority_level,
            recommended_action=recommended_action,
            estimated_waste_kg=estimated_waste_kg,
            status="pending",
        )
    return {
        "message": "Report submitted successfully. Awaiting municipal approval.",
        "report": dict(new_report),
        "ai_diagnosis": ai_diag,
    }


@router.get("")
async def list_reports(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
    user_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    viewer_role = current_user["role"]

    if viewer_role == "resident" and not user_id:
        rows = await get_reports_by_user(conn, current_user["sub"])
    elif user_id:
        rows = await get_reports_by_user(conn, user_id)
    else:
        # Admin — paginated, with reporter info
        rows = await get_reports(conn, viewer_role=viewer_role, page=page, limit=limit)

    result = [dict(r) for r in rows]
    if status_filter:
        result = [r for r in result if r["status"] == status_filter]
    if priority:
        result = [r for r in result if r["priority_level"] == priority]
    return result


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    report = await get_report_by_id(conn, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="That report couldn't be found")
    if current_user["role"] == "resident" and report["user_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="You don't have permission to do that")
    return dict(report)


@router.post("/{report_id}/approve")
async def approve_report_endpoint(
    report_id: str,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    report = await get_report_by_id(conn, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="That report couldn't be found")
    if report["status"] == "approved":
        raise HTTPException(status_code=422, detail="Report is already approved")

    updated = await approve_report(conn, report_id)
    points = max(10, round(report["environmental_impact_score"]))
    tx_id = f"tx-{int(time.time() * 1000):x}"
    await create_reward_transaction(
        conn,
        id=tx_id,
        user_id=report["user_id"],
        report_id=report["id"],
        points=points,
        type="earned",
        description=f"Approved {report['waste_type']} waste report ({report['priority_level']} priority)",
    )
    return {
        "message": f"Report approved. {points} Eco-Reward points credited to resident!",
        "report": dict(updated),
        "points_awarded": points,
    }


@router.post("/{report_id}/reject")
async def reject_report(
    report_id: str,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    report = await get_report_by_id(conn, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="That report couldn't be found")
    await update_report_status(conn, report_id, "rejected")
    return {"message": "Report rejected. No points were awarded.", "report_id": report_id, "status": "rejected"}


@router.patch("/{report_id}/status")
async def update_status(
    report_id: str,
    body: UpdateStatusRequest,
    current_user: Annotated[dict, Depends(require_admin)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    report = await get_report_by_id(conn, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="That report couldn't be found")
    await update_report_status(conn, report_id, body.status)
    return {"message": f"Report status updated to {body.status}", "report_id": report_id, "status": body.status}


@router.delete("/{report_id}")
async def delete_report_endpoint(
    report_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    """
    Soft-delete: marks the report as hidden for the current user's role.
    The report remains visible to the other role.
    If both roles have deleted it, it becomes hidden for both ('both').
    """
    report = await get_report_by_id(conn, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="That report couldn't be found")

    is_admin = current_user.get("role") == "admin"
    is_owner = report["user_id"] == current_user.get("sub")

    if not (is_admin or is_owner):
        raise HTTPException(status_code=403, detail="You don't have permission to delete this report")

    viewer_role = current_user["role"]
    updated = await soft_delete_report(conn, report_id, viewer_role)
    return {
        "message": "Report removed from your view successfully.",
        "report_id": report_id,
        "hidden_for": updated["hidden_for"] if updated else viewer_role,
    }
