-- GreenVision AI — Migration 002
-- Adds: soft-delete to reports, extended organic listings, organic_waste_requests table, profile_image to users
-- Run this AFTER schema.sql

-- ============================================================
-- 1. Soft-delete column on reports
--    hidden_for: NULL = visible to both | 'admin' = hidden from admin view
--                'resident' = hidden from resident view | 'both' = hidden from all
-- ============================================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS hidden_for TEXT DEFAULT NULL;

-- ============================================================
-- 2. Extended fields on organic_waste_listings (marketplace)
-- ============================================================
ALTER TABLE organic_waste_listings
  ADD COLUMN IF NOT EXISTS waste_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS pickup_location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_base64 TEXT DEFAULT '';

-- ============================================================
-- 3. New organic_waste_requests table (replaces direct claims flow)
--    Quantity is only decremented from available_kg on admin approval.
-- ============================================================
CREATE TABLE IF NOT EXISTS organic_waste_requests (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  requested_kg REAL NOT NULL CHECK (requested_kg > 0),
  contact_info TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES organic_waste_listings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_organic_requests_listing ON organic_waste_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_organic_requests_user ON organic_waste_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_organic_requests_status ON organic_waste_requests(status);

-- ============================================================
-- 4. Profile image on users
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT DEFAULT '';
