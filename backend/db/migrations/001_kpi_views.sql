-- GreenVision AI — KPI Analytics Views
-- Run this once against your Supabase Postgres database.
-- All three are PLAIN VIEWS (not materialized) — always fresh, no refresh cron needed.
-- NOTE: Convert to MATERIALIZED + a pg_cron refresh if query latency becomes an issue at scale.

-- ============================================================
-- 1. Daily report aggregates (powers trend/histogram chart)
-- ============================================================
CREATE OR REPLACE VIEW daily_report_stats AS
SELECT
    date_trunc('day', created_at)::date AS day,
    waste_type,
    priority_level,
    status,
    COUNT(*) AS report_count,
    ROUND(AVG(severity_score)::numeric, 2) AS avg_severity,
    ROUND(AVG(environmental_impact_score)::numeric, 2) AS avg_impact
FROM reports
GROUP BY 1, 2, 3, 4;

-- ============================================================
-- 2. Zone performance (powers heatmap / leaderboard table)
-- ============================================================
CREATE OR REPLACE VIEW zone_performance AS
SELECT
    zone_name,
    COUNT(*) AS total_scheduled,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
    ROUND(
        100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0),
        1
    ) AS completion_rate
FROM collection_schedule
GROUP BY zone_name;

-- ============================================================
-- 3. Weekly impact summary (powers landing-page KPI cards)
--    Uses CTEs to compute each metric independently — avoids
--    cartesian-product inflation when a report has multiple
--    reward_transactions or when organic records are joined.
-- ============================================================
CREATE OR REPLACE VIEW impact_summary AS
WITH weekly_reports AS (
    SELECT
        date_trunc('week', created_at) AS week,
        SUM(environmental_impact_score) AS total_env_impact,
        AVG(
            EXTRACT(EPOCH FROM (updated_at::timestamptz - created_at::timestamptz)) / 3600.0
        ) AS avg_response_hours
    FROM reports
    GROUP BY 1
),
weekly_points AS (
    SELECT
        date_trunc('week', created_at) AS week,
        SUM(points) AS points_issued
    FROM reward_transactions
    WHERE type = 'earned'
    GROUP BY 1
),
weekly_organic AS (
    SELECT
        date_trunc('week', created_at) AS week,
        SUM(quantity_kg) AS organic_kg_diverted
    FROM organic_waste_records
    GROUP BY 1
)
SELECT
    r.week,
    ROUND(r.total_env_impact::numeric, 2)          AS total_env_impact,
    ROUND(r.avg_response_hours::numeric, 2)         AS avg_response_hours,
    p.points_issued,
    ROUND(o.organic_kg_diverted::numeric, 2)        AS organic_kg_diverted
FROM weekly_reports r
LEFT JOIN weekly_points  p ON p.week = r.week
LEFT JOIN weekly_organic o ON o.week = r.week;

-- ============================================================
-- 4. Resident activity rank (future leaderboard tab)
-- ============================================================
CREATE OR REPLACE VIEW user_activity_rank AS
SELECT
    u.id AS user_id,
    u.name,
    u.address,
    COUNT(r.id) FILTER (WHERE r.status = 'approved') AS approved_reports,
    COALESCE(SUM(rt.points) FILTER (WHERE rt.type = 'earned'), 0) AS total_points_earned,
    RANK() OVER (ORDER BY COALESCE(SUM(rt.points) FILTER (WHERE rt.type = 'earned'), 0) DESC) AS rank
FROM users u
LEFT JOIN reports r ON r.user_id = u.id
LEFT JOIN reward_transactions rt ON rt.user_id = u.id
WHERE u.role = 'resident'
GROUP BY u.id, u.name, u.address;
