-- Complete Supabase Schema for Event Management App
-- This includes all tables, policies, indexes, and RLS setup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS event_comments CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS hosts CASCADE;

-- ==============================================
-- HOSTS TABLE
-- ==============================================
CREATE TABLE hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- EVENTS TABLE
-- ==============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location VARCHAR(500) NOT NULL,
  creator VARCHAR(255) NOT NULL,
  attendees TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_attendees INTEGER,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  category VARCHAR(100) NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern VARCHAR(20),
  status VARCHAR(20) DEFAULT 'upcoming',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- EVENT REGISTRATIONS TABLE
-- ==============================================
CREATE TABLE event_registrations (
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

-- ==============================================
-- EVENT COMMENTS TABLE
-- ==============================================
CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL,
  author_name VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES FOR HOSTS
-- ==============================================
CREATE POLICY "Hosts are viewable by everyone" ON hosts
  FOR SELECT USING (true);

CREATE POLICY "Users can create hosts" ON hosts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own host profile" ON hosts
  FOR UPDATE USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own host profile" ON hosts
  FOR DELETE USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

-- ==============================================
-- RLS POLICIES FOR EVENTS
-- ==============================================
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (creator = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (creator = current_setting('request.jwt.claims', true)::json->>'sub');

-- ==============================================
-- RLS POLICIES FOR EVENT REGISTRATIONS
-- ==============================================
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

-- ==============================================
-- RLS POLICIES FOR EVENT COMMENTS
-- ==============================================
CREATE POLICY "Comments are viewable by everyone" ON event_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON event_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON event_comments
  FOR UPDATE USING (author = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own comments" ON event_comments
  FOR DELETE USING (author = current_setting('request.jwt.claims', true)::json->>'sub');

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================
-- Hosts indexes
CREATE INDEX hosts_address_idx ON hosts(address);

-- Events indexes
CREATE INDEX events_date_idx ON events(date);
CREATE INDEX events_created_at_idx ON events(created_at);
CREATE INDEX events_creator_idx ON events(creator);
CREATE INDEX events_status_idx ON events(status);
CREATE INDEX events_tags_idx ON events USING GIN(tags);
CREATE INDEX events_attendees_idx ON events USING GIN(attendees);

-- Event registrations indexes
CREATE INDEX event_registrations_event_id_idx ON event_registrations(event_id);
CREATE INDEX event_registrations_user_address_idx ON event_registrations(user_address);
CREATE INDEX event_registrations_status_idx ON event_registrations(status);
CREATE INDEX event_registrations_registered_at_idx ON event_registrations(registered_at);

-- Event comments indexes
CREATE INDEX event_comments_event_id_idx ON event_comments(event_id);
CREATE INDEX event_comments_author_idx ON event_comments(author);
CREATE INDEX event_comments_created_at_idx ON event_comments(created_at);

-- ==============================================
-- USEFUL VIEWS (OPTIONAL)
-- ==============================================
-- View for events with attendee count
CREATE OR REPLACE VIEW events_with_stats AS
SELECT 
  e.*,
  COALESCE(array_length(e.attendees, 1), 0) as attendee_count,
  CASE 
    WHEN e.max_attendees IS NOT NULL AND COALESCE(array_length(e.attendees, 1), 0) >= e.max_attendees 
    THEN true 
    ELSE false 
  END as is_full
FROM events e;

-- View for host statistics
CREATE OR REPLACE VIEW host_stats AS
SELECT 
  h.address,
  h.name,
  h.avatar_url,
  h.bio,
  h.created_at,
  COUNT(e.id) as total_events,
  COALESCE(SUM(array_length(e.attendees, 1)), 0) as total_signups,
  COUNT(CASE WHEN e.status = 'upcoming' THEN 1 END) as upcoming_events,
  COUNT(CASE WHEN e.status = 'past' THEN 1 END) as past_events
FROM hosts h
LEFT JOIN events e ON h.address = e.creator
GROUP BY h.address, h.name, h.avatar_url, h.bio, h.created_at;

-- ==============================================
-- FUNCTIONS (OPTIONAL)
-- ==============================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for events
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ==============================================
-- Insert sample hosts
INSERT INTO hosts (address, name, bio) VALUES
  ('0x1234567890abcdef1234567890abcdef12345678', 'Alice Smith', 'Event organizer and community builder'),
  ('0xabcdef1234567890abcdef1234567890abcdef12', 'Bob Johnson', 'Tech meetup enthusiast')
ON CONFLICT (address) DO NOTHING;

-- Insert sample events
INSERT INTO events (title, description, date, time, location, creator, tags, max_attendees) VALUES
  ('Web3 Developer Meetup', 'Monthly meetup for Web3 developers to network and share knowledge', '2024-01-15', '18:00', 'Tech Hub Downtown', '0x1234567890abcdef1234567890abcdef12345678', ARRAY['tech', 'web3', 'networking'], 50),
  ('Blockchain Workshop', 'Hands-on workshop covering blockchain fundamentals', '2024-01-20', '14:00', 'Innovation Center', '0xabcdef1234567890abcdef1234567890abcdef12', ARRAY['blockchain', 'education', 'workshop'], 25)
ON CONFLICT (id) DO NOTHING;
