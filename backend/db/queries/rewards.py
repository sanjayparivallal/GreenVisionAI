"""Raw asyncpg queries for the reward_transactions table."""
from typing import List
import asyncpg


async def get_user_points(conn: asyncpg.Connection, user_id: str) -> dict:
    row = await conn.fetchrow(
        """
        SELECT
            COALESCE(SUM(points) FILTER (WHERE type = 'earned'), 0) AS earned,
            COALESCE(SUM(points) FILTER (WHERE type = 'redeemed'), 0) AS redeemed
        FROM reward_transactions
        WHERE user_id = $1
        """,
        user_id,
    )
    earned = int(row["earned"])
    redeemed = int(row["redeemed"])
    return {
        "earnedPoints": earned,
        "redeemedPoints": redeemed,
        "totalPoints": earned - redeemed,
    }


async def get_transactions_by_user(conn: asyncpg.Connection, user_id: str) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM reward_transactions WHERE user_id = $1 ORDER BY created_at DESC",
        user_id,
    )


async def create_reward_transaction(
    conn: asyncpg.Connection,
    *,
    id: str,
    user_id: str,
    points: int,
    type: str,
    description: str,
    report_id: str | None = None,
) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO reward_transactions (id, user_id, report_id, points, type, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,
        id, user_id, report_id, points, type, description,
    )
