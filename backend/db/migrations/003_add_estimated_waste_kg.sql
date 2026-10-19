-- GreenVision AI — Migration 003
-- Adds estimated_waste_kg column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS estimated_waste_kg REAL DEFAULT 0.0;
