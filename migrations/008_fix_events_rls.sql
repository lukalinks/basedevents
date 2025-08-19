-- Fix events table RLS policies for attendee updates
-- Migration: 008_fix_events_rls.sql

-- Check current policies on events table
-- DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
-- DROP POLICY IF EXISTS "Users can create events" ON events;
-- DROP POLICY IF EXISTS "Users can update their own events" ON events;
-- DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Ensure events table has permissive policies for anonymous access
-- This allows updating attendee lists without JWT authentication

-- Allow anyone to view events
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

-- Allow anyone to create events (for now)
CREATE POLICY "Anyone can create events" ON events
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update events (for attendee list updates)
-- This is needed for RSVP functionality
CREATE POLICY "Anyone can update events" ON events
  FOR UPDATE USING (true);

-- Allow creators to delete their events (by address matching)
CREATE POLICY "Creators can delete their events" ON events
  FOR DELETE USING (creator = current_setting('request.headers', true)::json->>'user-address');

-- Make sure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
