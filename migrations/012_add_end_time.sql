-- Add end_time column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add comment to the column
COMMENT ON COLUMN events.end_time IS 'Optional end time for the event';