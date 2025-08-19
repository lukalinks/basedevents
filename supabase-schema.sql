-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create events table
CREATE TABLE IF NOT EXISTS events (
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
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern VARCHAR(20),
  status VARCHAR(20) DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  price_usdc DECIMAL(10,2)
);

-- Create event_comments table
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL,
  author_name VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event registrations table for detailed user signup information
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

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for events table
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (creator = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (creator = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policies for event_comments table
CREATE POLICY "Comments are viewable by everyone" ON event_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON event_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON event_comments
  FOR UPDATE USING (author = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own comments" ON event_comments
  FOR DELETE USING (author = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policies for event_registrations table
CREATE POLICY "Registrations are viewable by everyone" ON event_registrations
  FOR SELECT USING (true);

CREATE POLICY "Users can register for events" ON event_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own registrations" ON event_registrations
  FOR UPDATE USING (true);

CREATE POLICY "Users can cancel their own registrations" ON event_registrations
  FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
CREATE INDEX IF NOT EXISTS events_creator_idx ON events(creator);
CREATE INDEX IF NOT EXISTS events_tags_idx ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS event_comments_event_id_idx ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS event_comments_author_idx ON event_comments(author);

-- Create indexes for event_registrations table
CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS event_registrations_user_address_idx ON event_registrations(user_address);
CREATE INDEX IF NOT EXISTS event_registrations_status_idx ON event_registrations(status);
CREATE INDEX IF NOT EXISTS event_registrations_registered_at_idx ON event_registrations(registered_at);
