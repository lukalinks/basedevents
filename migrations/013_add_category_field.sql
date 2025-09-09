-- Migration: Add category field to events table
-- This migration adds a category field to the events table

-- Add category column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Set default category for existing events
UPDATE events SET category = 'Other' WHERE category IS NULL;

-- Make category NOT NULL after setting defaults
ALTER TABLE events ALTER COLUMN category SET NOT NULL;

-- Add index for category field for better query performance
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- Add comment for documentation
COMMENT ON COLUMN events.category IS 'Event category (Technology, Business, Education, etc.)';
