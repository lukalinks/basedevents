-- Add slug column to events table for SEO-friendly URLs
ALTER TABLE events ADD COLUMN slug TEXT;

-- Create unique index on slug for fast lookups
CREATE UNIQUE INDEX idx_events_slug ON events(slug);

-- Create index on slug for partial matching (in case we need it)
CREATE INDEX idx_events_slug_partial ON events(slug text_pattern_ops);

-- Add comment to explain the column
COMMENT ON COLUMN events.slug IS 'SEO-friendly URL slug generated from event title';
