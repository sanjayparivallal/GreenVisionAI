-- GreenVision AI Database Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'resident')) NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_schedule (
  id TEXT PRIMARY KEY,
  zone_name TEXT NOT NULL,
  waste_type TEXT NOT NULL,
  collection_date TEXT NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'delayed')) DEFAULT 'scheduled',
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_base64 TEXT NOT NULL,
  location_text TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  waste_type TEXT CHECK (waste_type IN ('organic', 'recyclable', 'general', 'hazardous')) NOT NULL,
  fill_level TEXT CHECK (fill_level IN ('empty', 'half-full', 'full', 'overflowing')) NOT NULL,
  severity_score REAL NOT NULL,
  environmental_impact_score REAL NOT NULL,
  priority_level TEXT CHECK (priority_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  recommended_action TEXT NOT NULL,
  estimated_waste_kg REAL NOT NULL DEFAULT 0.0,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'collected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reward_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_id TEXT,
  points INTEGER NOT NULL,
  type TEXT CHECK (type IN ('earned', 'redeemed')) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE TABLE IF NOT EXISTS organic_waste_records (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  quantity_kg REAL NOT NULL,
  distributed_to TEXT NOT NULL,
  distribution_date TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority_level);

CREATE TABLE IF NOT EXISTS organic_waste_listings (
  id TEXT PRIMARY KEY,
  posted_by TEXT NOT NULL,
  total_kg REAL NOT NULL,
  available_kg REAL NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS organic_waste_claims (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  claimed_kg REAL NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES organic_waste_listings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

