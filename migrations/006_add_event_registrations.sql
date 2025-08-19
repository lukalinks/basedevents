-- Add event registrations table for detailed user signup information
-- Migration: 006_add_event_registrations.sql

-- Create event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_address VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_phone VARCHAR(50),
  user_bio TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'confirmed',
  UNIQUE(event_id, user_address)
);

-- Enable RLS for event registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event registrations
CREATE POLICY "Registrations are viewable by event creators and registrants" ON event_registrations
  FOR SELECT USING (
    user_address = current_setting('request.jwt.claims', true)::json->>'sub' OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_registrations.event_id 
      AND events.creator = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can register for events" ON event_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own registrations" ON event_registrations
  FOR UPDATE USING (user_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can cancel their own registrations" ON event_registrations
  FOR DELETE USING (user_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS event_registrations_user_address_idx ON event_registrations(user_address);
CREATE INDEX IF NOT EXISTS event_registrations_status_idx ON event_registrations(status);
CREATE INDEX IF NOT EXISTS event_registrations_registered_at_idx ON event_registrations(registered_at);
