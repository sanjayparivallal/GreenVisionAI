"""Raw asyncpg queries for KPI views (impact_summary, daily_report_stats, zone_performance)."""
from typing import List
import asyncpg


async def get_impact_summary(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    """Reads from the impact_summary plain view (see migrations/001_kpi_views.sql)."""
    return await conn.fetch(
        "SELECT * FROM impact_summary ORDER BY week DESC LIMIT 52"
    )


async def get_daily_report_stats(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM daily_report_stats ORDER BY day DESC LIMIT 90"
    )


async def get_zone_performance(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM zone_performance ORDER BY completion_rate DESC"
    )


async def get_platform_totals(conn: asyncpg.Connection) -> asyncpg.Record:
    """Aggregated platform-wide KPIs for the landing page cards."""
    return await conn.fetchrow(
        """
        SELECT
            COUNT(*) FILTER (WHERE status IN ('approved','collected','in_progress')) AS overflows_addressed,
            COALESCE((SELECT SUM(quantity_kg) FROM organic_waste_records), 0) AS organic_kg_total,
            COALESCE((SELECT SUM(points) FROM reward_transactions WHERE type = 'earned'), 0) AS total_points_issued,
            ROUND(
                100.0 * COUNT(*) FILTER (WHERE status = 'completed') /
                NULLIF(COUNT(*) FILTER (WHERE status != 'delayed'), 0), 1
            ) AS sla_compliance_pct
        FROM collection_schedule
        """
    )


async def get_leaderboard(conn: asyncpg.Connection, limit: int = 20) -> List[asyncpg.Record]:
    """Top resident contributors by earned points (uses user_activity_rank view)."""
    return await conn.fetch(
        "SELECT * FROM user_activity_rank ORDER BY rank ASC LIMIT $1",
        limit,
    )
