"""FastAPI rewards router."""
import time
import secrets
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from core.dependencies import get_db, get_current_user
from db.queries.rewards import get_user_points, get_transactions_by_user, create_reward_transaction
from db.queries.reports import get_reports_by_user
from schemas.models import RedeemRequest

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/summary")
async def rewards_summary(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    user_id = current_user["sub"]
    points_data = await get_user_points(conn, user_id)
    user_reports = await get_reports_by_user(conn, user_id)
    pending = [r for r in user_reports if r["status"] == "pending"]
    estimated = sum(max(10, round(r["environmental_impact_score"])) for r in pending)
    return {
        "total_points": points_data["totalPoints"],
        "earned_points": points_data["earnedPoints"],
        "redeemed_points": points_data["redeemedPoints"],
        "pending_reports_count": len(pending),
        "estimated_pending_points": estimated,
    }


@router.get("/history")
async def rewards_history(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    rows = await get_transactions_by_user(conn, current_user["sub"])
    return [dict(r) for r in rows]


@router.post("/redeem")
async def redeem_reward(
    body: RedeemRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    user_id = current_user["sub"]
    points_data = await get_user_points(conn, user_id)
    if points_data["totalPoints"] < body.points_required:
        raise HTTPException(
            status_code=422,
            detail=f"Insufficient points. You have {points_data['totalPoints']} pts but {body.points_required} pts are required.",
        )
    # Generate a real unique voucher code
    voucher_code = secrets.token_urlsafe(8).upper()
    tx_id = f"tx-{int(time.time() * 1000):x}"
    tx = await create_reward_transaction(
        conn,
        id=tx_id,
        user_id=user_id,
        points=body.points_required,
        type="redeemed",
        description=f"Redeemed: {body.reward_title} | Voucher: {voucher_code}",
    )
    return {
        "message": f"Successfully redeemed {body.reward_title}!",
        "voucher_code": voucher_code,
        "transaction": dict(tx),
        "remaining_points": points_data["totalPoints"] - body.points_required,
    }
