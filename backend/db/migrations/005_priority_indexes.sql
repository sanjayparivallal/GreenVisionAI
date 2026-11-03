-- GreenVision AI — Migration 005: Additional performance indexes
-- Adds indexes for the new multi-factor priority columns and common query patterns.

-- Reports: fast filtering by priority and landmark context
CREATE INDEX IF NOT EXISTS idx_reports_priority_level
  ON reports(priority_level);

CREATE INDEX IF NOT EXISTS idx_reports_status
  ON reports(status);

CREATE INDEX IF NOT EXISTS idx_reports_user_id
  ON reports(user_id);

CREATE INDEX IF NOT EXISTS idx_reports_landmark_type
  ON reports(landmark_type);

CREATE INDEX IF NOT EXISTS idx_reports_is_escalated
  ON reports(is_drain_blocked, is_road_blocked);

-- Compound index for admin dashboard (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON reports(status, created_at DESC);

-- Users: fast lookup by email (login)
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

-- Collection schedule: fast range queries
CREATE INDEX IF NOT EXISTS idx_schedule_collection_date_ts
  ON collection_schedule(collection_date_ts)
  WHERE collection_date_ts IS NOT NULL;

-- Rewards: fast user balance lookups
CREATE INDEX IF NOT EXISTS idx_rewards_user_id
  ON rewards(user_id);

-- Organic waste listings: fast open listing queries
CREATE INDEX IF NOT EXISTS idx_organic_listings_status_expires
  ON organic_waste_listings(status, available_until);
