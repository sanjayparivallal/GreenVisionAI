-- GreenVision AI — Migration 006: Supabase Row-Level Security (RLS)
-- Enables secure multi-tenant access control for Supabase / PostgREST clients.

-- 1. Enable RLS on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE organic_waste_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organic_waste_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if re-running
DROP POLICY IF EXISTS "Public users can view collection schedule" ON collection_schedule;
DROP POLICY IF EXISTS "Users can view open organic listings" ON organic_waste_listings;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Residents can view active reports" ON reports;
DROP POLICY IF EXISTS "Users can view their own rewards" ON rewards;
DROP POLICY IF EXISTS "Users can view their own transactions" ON reward_transactions;
DROP POLICY IF EXISTS "Users can view their own feedback tickets" ON feedback;

-- 3. Read access policies
-- Schedules and open marketplace listings are public/resident readable
CREATE POLICY "Public users can view collection schedule"
  ON collection_schedule FOR SELECT
  USING (true);

CREATE POLICY "Users can view open organic listings"
  ON organic_waste_listings FOR SELECT
  USING (status = 'open');

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id OR auth.jwt() ->> 'role' = 'admin');

-- Residents can view reports that are not hidden for them
CREATE POLICY "Residents can view active reports"
  ON reports FOR SELECT
  USING (hidden_for IS NULL OR hidden_for != 'resident');

-- Users can view their own rewards & transactions
CREATE POLICY "Users can view their own rewards"
  ON rewards FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view their own transactions"
  ON reward_transactions FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view their own feedback tickets"
  ON feedback FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt() ->> 'role' = 'admin');

-- Note: The FastAPI backend connects directly via asyncpg connection string using
-- the postgres superuser/service-role credentials, which automatically bypasses RLS
-- while enforcing security at the application API layer.
