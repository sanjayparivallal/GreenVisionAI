"""Raw asyncpg queries for the users table."""
from typing import Optional
import asyncpg


async def get_user_by_email(conn: asyncpg.Connection, email: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "SELECT * FROM users WHERE email = $1", email
    )


async def get_user_by_id(conn: asyncpg.Connection, user_id: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "SELECT * FROM users WHERE id = $1", user_id
    )


async def create_user(
    conn: asyncpg.Connection,
    *,
    id: str,
    name: str,
    email: str,
    password_hash: str,
    phone: str,
    role: str,
    address: str,
) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO users (id, name, email, password_hash, phone, role, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """,
        id, name, email, password_hash, phone, role, address,
    )


async def update_user_profile(
    conn: asyncpg.Connection,
    *,
    user_id: str,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    profile_image: Optional[str] = None,
) -> Optional[asyncpg.Record]:
    """Patch-style update: only updates non-None fields."""
    # Build SET clause dynamically
    fields = []
    values = []
    idx = 1

    if name is not None:
        fields.append(f"name = ${idx}")
        values.append(name)
        idx += 1
    if phone is not None:
        fields.append(f"phone = ${idx}")
        values.append(phone)
        idx += 1
    if address is not None:
        fields.append(f"address = ${idx}")
        values.append(address)
        idx += 1
    if profile_image is not None:
        fields.append(f"profile_image = ${idx}")
        values.append(profile_image)
        idx += 1

    if not fields:
        return await get_user_by_id(conn, user_id)

    values.append(user_id)
    query = f"UPDATE users SET {', '.join(fields)} WHERE id = ${idx} RETURNING *"
    return await conn.fetchrow(query, *values)


async def update_user_password(conn: asyncpg.Connection, user_id: str, new_hash: str) -> Optional[asyncpg.Record]:
    """Update the password_hash for a user. Returns the updated user row."""
    return await conn.fetchrow(
        "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *",
        new_hash, user_id,
    )
