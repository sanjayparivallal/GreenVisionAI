-- GreenVision AI — Migration 004
-- Adds a proper TIMESTAMPTZ column for collection dates (non-breaking)
-- The original collection_date TEXT column is kept for backwards compatibility.
-- New entries should use collection_date_ts; UI should read collection_date_ts when non-null.

ALTER TABLE collection_schedule
  ADD COLUMN IF NOT EXISTS collection_date_ts TIMESTAMPTZ DEFAULT NULL;

-- Optional: try to backfill existing TEXT dates (may fail for custom formats)
-- UPDATE collection_schedule SET collection_date_ts = collection_date::TIMESTAMPTZ
-- WHERE collection_date ~ '^\d{4}-\d{2}-\d{2}';

-- Useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_organic_requests_listing_user
  ON organic_waste_requests(listing_id, user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id
  ON feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_reports_created_at
  ON reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id
  ON reward_transactions(user_id);
