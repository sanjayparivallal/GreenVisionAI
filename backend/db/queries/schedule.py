"""Raw asyncpg queries for the collection_schedule table."""
from typing import List

import asyncpg


async def get_schedules(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    return await conn.fetch("SELECT * FROM collection_schedule ORDER BY collection_date")


async def create_schedule(
    conn: asyncpg.Connection,
    *,
    id: str,
    zone_name: str,
    waste_type: str,
    collection_date: str,
    status: str,
    created_by: str,
) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO collection_schedule (id, zone_name, waste_type, collection_date, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,
        id, zone_name, waste_type, collection_date, status, created_by,
    )


async def update_schedule_status(conn: asyncpg.Connection, schedule_id: str, status: str) -> None:
    await conn.execute(
        "UPDATE collection_schedule SET status = $1 WHERE id = $2",
        status, schedule_id,
    )


async def delete_schedule(conn: asyncpg.Connection, schedule_id: str) -> None:
    await conn.execute("DELETE FROM collection_schedule WHERE id = $1", schedule_id)
