"""Raw asyncpg queries for the feedback table."""
from typing import List
import asyncpg


async def create_feedback(
    conn: asyncpg.Connection,
    *,
    id: str,
    user_id: str,
    subject: str,
    message: str,
    status: str = "open",
) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO feedback (id, user_id, subject, message, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        id, user_id, subject, message, status,
    )


async def get_feedback_by_user(conn: asyncpg.Connection, user_id: str) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC", user_id
    )


async def get_all_feedback(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    return await conn.fetch("SELECT * FROM feedback ORDER BY created_at DESC")


async def respond_to_feedback(
    conn: asyncpg.Connection,
    feedback_id: str,
    admin_response: str,
    status: str,
) -> None:
    await conn.execute(
        """
        UPDATE feedback
        SET admin_response = $1, status = $2, updated_at = NOW()
        WHERE id = $3
        """,
        admin_response, status, feedback_id,
    )
