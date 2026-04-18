-- Quick Fix: Add status column to existing consultations table
-- Run this first in Supabase SQL Editor

-- Add status column if it doesn't exist
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled'));

-- Add updated_at column if it doesn't exist
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have default status
UPDATE consultations
SET status = 'pending'
WHERE status IS NULL OR status = '';

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'consultations'
ORDER BY ordinal_position;