"""FastAPI stats/KPI router — feeds the landing page and dashboard KPI cards."""
from typing import Annotated
from fastapi import APIRouter, Depends, Query
import asyncpg

from core.dependencies import get_db, get_current_user
from db.queries.stats import (
    get_impact_summary, get_daily_report_stats,
    get_zone_performance, get_platform_totals, get_leaderboard,
)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/impact")
async def impact_summary(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    rows = await get_impact_summary(conn)
    return [dict(r) for r in rows]


@router.get("/daily")
async def daily_stats(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    rows = await get_daily_report_stats(conn)
    return [dict(r) for r in rows]


@router.get("/zones")
async def zone_performance(
    current_user: Annotated[dict, Depends(get_current_user)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
):
    rows = await get_zone_performance(conn)
    return [dict(r) for r in rows]


@router.get("/platform")
async def platform_totals(conn: Annotated[asyncpg.Connection, Depends(get_db)]):
    """Public endpoint (no auth) — powers the landing page KPI cards."""
    row = await get_platform_totals(conn)
    if not row:
        return {
            "overflows_addressed": 0,
            "organic_kg_total": 0,
            "total_points_issued": 0,
            "sla_compliance_pct": None,
        }
    return dict(row)


@router.get("/leaderboard")
async def leaderboard(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
    limit: int = Query(20, ge=1, le=100),
):
    """Public endpoint (no auth) — top resident eco-contributors."""
    rows = await get_leaderboard(conn, limit=limit)
    return [dict(r) for r in rows]
