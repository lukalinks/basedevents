-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create hosts table
CREATE TABLE IF NOT EXISTS hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Enable Row Level Security (RLS)
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Policies for hosts
CREATE POLICY "Hosts are viewable by everyone" ON hosts
  FOR SELECT USING (true);

CREATE POLICY "Users can create hosts" ON hosts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own host profile" ON hosts
  FOR UPDATE USING (address = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policies for events table
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (creator = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (creator = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policies for event_comments table
CREATE POLICY "Comments are viewable by everyone" ON event_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON event_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON event_comments
  FOR UPDATE USING (author = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own comments" ON event_comments
  FOR DELETE USING (author = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS hosts_address_idx ON hosts(address);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
CREATE INDEX IF NOT EXISTS events_creator_idx ON events(creator);
CREATE INDEX IF NOT EXISTS events_tags_idx ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS event_comments_event_id_idx ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS event_comments_author_idx ON event_comments(author);
