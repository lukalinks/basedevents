-- Add index on created_at column for better query performance
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events(created_at);

-- Add index on date column for better query performance  
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);

-- Add index on creator column for user-specific queries
CREATE INDEX IF NOT EXISTS events_creator_idx ON events(creator);
