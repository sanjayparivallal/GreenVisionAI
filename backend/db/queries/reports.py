"""Raw asyncpg queries for the reports table."""
from typing import Optional, List
import asyncpg


async def create_report(conn: asyncpg.Connection, *, id: str, user_id: str,
                        image_base64: str, location_text: str,
                        latitude: float, longitude: float,
                        waste_type: str, fill_level: str,
                        severity_score: float, environmental_impact_score: float,
                        priority_level: str, recommended_action: str,
                        estimated_waste_kg: float = 0.0,
                        status: str = "pending",
                        landmark_type: str = "general",
                        odor_level: str = "normal",
                        is_drain_blocked: bool = False,
                        is_road_blocked: bool = False,
                        escalation_reason: Optional[str] = None) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO reports (
            id, user_id, image_base64, location_text, latitude, longitude,
            waste_type, fill_level, severity_score, environmental_impact_score,
            priority_level, recommended_action, estimated_waste_kg, status,
            landmark_type, odor_level, is_drain_blocked, is_road_blocked, escalation_reason
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING *
        """,
        id, user_id, image_base64, location_text, latitude, longitude,
        waste_type, fill_level, severity_score, environmental_impact_score,
        priority_level, recommended_action, estimated_waste_kg, status,
        landmark_type, odor_level, is_drain_blocked, is_road_blocked, escalation_reason,
    )


async def get_reports(
    conn: asyncpg.Connection,
    viewer_role: str = "admin",
    page: int = 1,
    limit: int = 50,
) -> List[asyncpg.Record]:
    """Fetch reports (admin view) with reporter info, pagination, dynamic stagnation escalation, and soft-delete filter."""
    offset = (page - 1) * limit
    return await conn.fetch(
        """
        SELECT r.id, r.user_id, r.image_base64, r.location_text, r.latitude, r.longitude,
               r.waste_type, r.fill_level, r.severity_score, r.environmental_impact_score,
               r.recommended_action, r.estimated_waste_kg, r.status, r.hidden_for,
               COALESCE(r.landmark_type, 'general') AS landmark_type,
               COALESCE(r.odor_level, 'normal') AS odor_level,
               COALESCE(r.is_drain_blocked, FALSE) AS is_drain_blocked,
               COALESCE(r.is_road_blocked, FALSE) AS is_road_blocked,
               r.created_at, r.updated_at,
               u.name  AS reporter_name,
               u.email AS reporter_email,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48
                       THEN 'critical'
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium')
                       THEN 'high'
                   ELSE r.priority_level
               END AS priority_level,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48
                       THEN 'Stagnant (48h+ uncollected)'
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium')
                       THEN 'Stagnant (24h+ uncollected)'
                   ELSE r.escalation_reason
               END AS escalation_reason,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (
                       (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48 OR
                       ((EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium'))
                   ) THEN TRUE
                   ELSE FALSE
               END AS is_escalated
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE (r.hidden_for IS NULL OR (r.hidden_for != $1 AND r.hidden_for != 'both'))
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
        """,
        viewer_role, limit, offset,
    )


async def get_reports_by_user(conn: asyncpg.Connection, user_id: str) -> List[asyncpg.Record]:
    """Fetch reports for a specific user with dynamic stagnation escalation."""
    return await conn.fetch(
        """
        SELECT r.id, r.user_id, r.image_base64, r.location_text, r.latitude, r.longitude,
               r.waste_type, r.fill_level, r.severity_score, r.environmental_impact_score,
               r.recommended_action, r.estimated_waste_kg, r.status, r.hidden_for,
               COALESCE(r.landmark_type, 'general') AS landmark_type,
               COALESCE(r.odor_level, 'normal') AS odor_level,
               COALESCE(r.is_drain_blocked, FALSE) AS is_drain_blocked,
               COALESCE(r.is_road_blocked, FALSE) AS is_road_blocked,
               r.created_at, r.updated_at,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48
                       THEN 'critical'
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium')
                       THEN 'high'
                   ELSE r.priority_level
               END AS priority_level,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48
                       THEN 'Stagnant (48h+ uncollected)'
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium')
                       THEN 'Stagnant (24h+ uncollected)'
                   ELSE r.escalation_reason
               END AS escalation_reason,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (
                       (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48 OR
                       ((EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium'))
                   ) THEN TRUE
                   ELSE FALSE
               END AS is_escalated
        FROM reports r
        WHERE user_id = $1
          AND (hidden_for IS NULL OR (hidden_for != 'resident' AND hidden_for != 'both'))
        ORDER BY created_at DESC
        """,
        user_id,
    )


async def get_report_by_id(conn: asyncpg.Connection, report_id: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        """
        SELECT r.id, r.user_id, r.image_base64, r.location_text, r.latitude, r.longitude,
               r.waste_type, r.fill_level, r.severity_score, r.environmental_impact_score,
               r.recommended_action, r.estimated_waste_kg, r.status, r.hidden_for,
               COALESCE(r.landmark_type, 'general') AS landmark_type,
               COALESCE(r.odor_level, 'normal') AS odor_level,
               COALESCE(r.is_drain_blocked, FALSE) AS is_drain_blocked,
               COALESCE(r.is_road_blocked, FALSE) AS is_road_blocked,
               r.created_at, r.updated_at,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48
                       THEN 'critical'
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium')
                       THEN 'high'
                   ELSE r.priority_level
               END AS priority_level,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48
                       THEN 'Stagnant (48h+ uncollected)'
                   WHEN r.status NOT IN ('collected', 'rejected') AND (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium')
                       THEN 'Stagnant (24h+ uncollected)'
                   ELSE r.escalation_reason
               END AS escalation_reason,
               CASE
                   WHEN r.status NOT IN ('collected', 'rejected') AND (
                       (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 48 OR
                       ((EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0) >= 24 AND r.priority_level IN ('low', 'medium'))
                   ) THEN TRUE
                   ELSE FALSE
               END AS is_escalated
        FROM reports r
        WHERE r.id = $1
        """,
        report_id,
    )


async def update_report_status(conn: asyncpg.Connection, report_id: str, status: str) -> None:
    await conn.execute(
        "UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2",
        status, report_id,
    )


async def approve_report(conn: asyncpg.Connection, report_id: str) -> asyncpg.Record:
    return await conn.fetchrow(
        "UPDATE reports SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *",
        report_id,
    )


async def delete_report_image(conn: asyncpg.Connection, report_id: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        "UPDATE reports SET image_base64 = '', updated_at = NOW() WHERE id = $1 RETURNING *",
        report_id,
    )


async def soft_delete_report(conn: asyncpg.Connection, report_id: str, viewer_role: str) -> Optional[asyncpg.Record]:
    """
    Soft-delete: marks hidden_for based on who is deleting.
    - If hidden_for is already set to the other role, escalate to 'both'.
    - If not set at all, set to this role.
    """
    existing = await conn.fetchrow("SELECT hidden_for FROM reports WHERE id = $1", report_id)
    if not existing:
        return None

    current_hidden = existing["hidden_for"]
    other_role = "admin" if viewer_role == "resident" else "resident"

    if current_hidden == other_role:
        new_hidden = "both"
    elif current_hidden == "both":
        new_hidden = "both"
    else:
        new_hidden = viewer_role

    return await conn.fetchrow(
        "UPDATE reports SET hidden_for = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        new_hidden, report_id,
    )


async def hard_delete_report(conn: asyncpg.Connection, report_id: str) -> Optional[asyncpg.Record]:
    """Permanently deletes a report and nullifies FK references. Admin-only."""
    async with conn.transaction():
        await conn.execute("UPDATE reward_transactions SET report_id = NULL WHERE report_id = $1", report_id)
        await conn.execute("UPDATE organic_waste_records SET report_id = NULL WHERE report_id = $1", report_id)
        return await conn.fetchrow("DELETE FROM reports WHERE id = $1 RETURNING *", report_id)
