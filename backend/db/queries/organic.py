"""Raw asyncpg queries for organic waste marketplace."""
from datetime import datetime
from typing import List, Optional
import asyncpg


# ---------------------------------------------------------------------------
# Legacy farm distribution records (kept for backwards compatibility)
# ---------------------------------------------------------------------------

async def get_organic_records(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM organic_waste_records ORDER BY distribution_date DESC"
    )


async def create_organic_record(
    conn: asyncpg.Connection,
    *,
    id: str,
    report_id: str | None,
    quantity_kg: float,
    distributed_to: str,
    distribution_date: str,
    status: str,
) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO organic_waste_records (id, report_id, quantity_kg, distributed_to, distribution_date, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,
        id, report_id, quantity_kg, distributed_to, distribution_date, status,
    )


async def update_organic_status(conn: asyncpg.Connection, record_id: str, status: str) -> None:
    await conn.execute(
        "UPDATE organic_waste_records SET status = $1 WHERE id = $2", status, record_id
    )


# ---------------------------------------------------------------------------
# Organic Listings (Marketplace)
# ---------------------------------------------------------------------------

async def create_listing(
    conn: asyncpg.Connection,
    *,
    id: str,
    posted_by: str,
    total_kg: float,
    description: str,
    waste_type: str = "general",
    pickup_location: str = "",
    available_until: Optional[datetime] = None,
    image_base64: str = "",
) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO organic_waste_listings
          (id, posted_by, total_kg, available_kg, description, waste_type,
           pickup_location, available_until, image_base64, status)
        VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, 'open')
        RETURNING *
        """,
        id, posted_by, total_kg, description, waste_type,
        pickup_location, available_until, image_base64,
    )


async def get_listings(conn: asyncpg.Connection, status: str | None = None) -> List[asyncpg.Record]:
    """Fetch listings, filtering out expired ones and respecting status filter."""
    if status:
        return await conn.fetch(
            """
            SELECT * FROM organic_waste_listings
            WHERE status = $1
              AND (available_until IS NULL OR available_until > NOW())
            ORDER BY created_at DESC
            """,
            status,
        )
    return await conn.fetch(
        """
        SELECT * FROM organic_waste_listings
        WHERE (available_until IS NULL OR available_until > NOW())
        ORDER BY created_at DESC
        """
    )


async def expire_old_listings(conn: asyncpg.Connection) -> int:
    """Close listings whose available_until has passed. Returns count of closed listings."""
    result = await conn.execute(
        """
        UPDATE organic_waste_listings
        SET status = 'closed'
        WHERE status = 'open'
          AND available_until IS NOT NULL
          AND available_until < NOW()
        """
    )
    # asyncpg returns 'UPDATE N' — parse count
    try:
        return int(str(result).split()[-1])
    except Exception:
        return 0


async def get_listing_by_id(conn: asyncpg.Connection, listing_id: str) -> asyncpg.Record | None:
    return await conn.fetchrow("SELECT * FROM organic_waste_listings WHERE id = $1", listing_id)


async def close_listing(conn: asyncpg.Connection, listing_id: str) -> None:
    await conn.execute(
        "UPDATE organic_waste_listings SET status = 'closed' WHERE id = $1", listing_id
    )


# ---------------------------------------------------------------------------
# Organic Waste Requests (new approval-based flow)
# ---------------------------------------------------------------------------

async def create_request(
    conn: asyncpg.Connection,
    *,
    id: str,
    listing_id: str,
    user_id: str,
    requested_kg: float,
    contact_info: str,
) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO organic_waste_requests
          (id, listing_id, user_id, requested_kg, contact_info, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *
        """,
        id, listing_id, user_id, requested_kg, contact_info,
    )


async def get_requests_by_listing(conn: asyncpg.Connection, listing_id: str) -> List[asyncpg.Record]:
    return await conn.fetch(
        """
        SELECT r.*, u.name as requester_name, u.email as requester_email
        FROM organic_waste_requests r
        JOIN users u ON r.user_id = u.id
        WHERE r.listing_id = $1
        ORDER BY r.created_at ASC
        """,
        listing_id,
    )


async def get_all_requests(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    """Admin: get all requests with listing and user info."""
    return await conn.fetch(
        """
        SELECT r.*, u.name as requester_name, u.email as requester_email,
               l.description as listing_description, l.waste_type
        FROM organic_waste_requests r
        JOIN users u ON r.user_id = u.id
        JOIN organic_waste_listings l ON r.listing_id = l.id
        ORDER BY r.created_at DESC
        """,
    )


async def get_requests_by_user(conn: asyncpg.Connection, user_id: str) -> List[asyncpg.Record]:
    return await conn.fetch(
        """
        SELECT r.*, l.description as listing_description, l.waste_type,
               l.pickup_location, l.available_kg
        FROM organic_waste_requests r
        JOIN organic_waste_listings l ON r.listing_id = l.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        """,
        user_id,
    )


async def get_request_by_id(conn: asyncpg.Connection, request_id: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "SELECT * FROM organic_waste_requests WHERE id = $1", request_id
    )


async def has_pending_request(conn: asyncpg.Connection, listing_id: str, user_id: str) -> bool:
    """Check if user already has an active (pending/approved) request for this listing."""
    row = await conn.fetchrow(
        """
        SELECT id FROM organic_waste_requests
        WHERE listing_id = $1 AND user_id = $2
          AND status IN ('pending', 'approved')
        """,
        listing_id, user_id,
    )
    return row is not None


async def approve_request_atomic(
    conn: asyncpg.Connection,
    request_id: str,
    admin_note: str = "",
) -> dict:
    """
    Atomically approve a request: decrement available_kg on the listing.
    Closes listing if no kg remain. Raises ValueError on validation failures.
    """
    async with conn.transaction():
        req = await conn.fetchrow(
            "SELECT * FROM organic_waste_requests WHERE id = $1 FOR UPDATE", request_id
        )
        if not req:
            raise ValueError("Request not found.")
        if req["status"] != "pending":
            raise ValueError(f"Request is already {req['status']}.")

        listing = await conn.fetchrow(
            "SELECT * FROM organic_waste_listings WHERE id = $1 FOR UPDATE", req["listing_id"]
        )
        if not listing:
            raise ValueError("Associated listing not found.")
        if listing["status"] == "closed":
            raise ValueError("This listing is already closed.")

        available = float(listing["available_kg"])
        requested = float(req["requested_kg"])
        if requested > available:
            raise ValueError(
                f"Insufficient stock: only {available:.1f}kg available but {requested:.1f}kg requested."
            )

        new_available = round(available - requested, 2)
        new_listing_status = "closed" if new_available <= 0.001 else "open"

        updated_listing = await conn.fetchrow(
            """
            UPDATE organic_waste_listings
            SET available_kg = $1, status = $2
            WHERE id = $3
            RETURNING *
            """,
            new_available, new_listing_status, listing["id"],
        )

        updated_req = await conn.fetchrow(
            """
            UPDATE organic_waste_requests
            SET status = 'approved', admin_note = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
            """,
            admin_note, request_id,
        )
        return {"request": dict(updated_req), "listing": dict(updated_listing)}


async def update_request_status(
    conn: asyncpg.Connection,
    request_id: str,
    new_status: str,
    admin_note: str = "",
) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        """
        UPDATE organic_waste_requests
        SET status = $1, admin_note = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
        """,
        new_status, admin_note, request_id,
    )


# ---------------------------------------------------------------------------
# Legacy claims (kept for backwards compatibility if any existing data)
# ---------------------------------------------------------------------------

async def get_claims_by_user(conn: asyncpg.Connection, user_id: str) -> List[asyncpg.Record]:
    return await conn.fetch(
        """
        SELECT c.*, l.description, l.posted_by
        FROM organic_waste_claims c
        JOIN organic_waste_listings l ON c.listing_id = l.id
        WHERE c.user_id = $1
        ORDER BY c.claimed_at DESC
        """,
        user_id,
    )


async def claim_organic_waste_atomic(
    conn: asyncpg.Connection,
    *,
    claim_id: str,
    listing_id: str,
    user_id: str,
    claimed_kg: float,
) -> dict:
    """Legacy atomic claim. Kept for backwards compat."""
    async with conn.transaction():
        listing = await conn.fetchrow(
            "SELECT * FROM organic_waste_listings WHERE id = $1 FOR UPDATE", listing_id
        )
        if not listing:
            raise ValueError("Organic waste listing not found.")

        if listing["status"] == "closed" or listing["available_kg"] <= 0:
            raise ValueError("This organic waste listing is fully claimed and closed.")

        available = float(listing["available_kg"])
        if claimed_kg > available:
            raise ValueError(f"Only {available:.1f}kg remaining on this listing. Please reduce your claim.")

        new_available = round(available - claimed_kg, 2)
        new_status = "closed" if new_available <= 0.001 else "open"

        updated_listing = await conn.fetchrow(
            """
            UPDATE organic_waste_listings
            SET available_kg = $1, status = $2
            WHERE id = $3
            RETURNING *
            """,
            new_available, new_status, listing_id,
        )

        claim = await conn.fetchrow(
            """
            INSERT INTO organic_waste_claims (id, listing_id, user_id, claimed_kg)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            claim_id, listing_id, user_id, claimed_kg,
        )
        return {"claim": dict(claim), "listing": dict(updated_listing)}
