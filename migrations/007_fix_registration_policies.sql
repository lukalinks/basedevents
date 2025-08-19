-- Fix event registrations RLS policies for anonymous access
-- Migration: 007_fix_registration_policies.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Registrations are viewable by event creators and registrants" ON event_registrations;
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can cancel their own registrations" ON event_registrations;

-- Create simpler policies that work with anonymous access
-- Allow anyone to view registrations (for now, can be tightened later)
CREATE POLICY "Anyone can view registrations" ON event_registrations
  FOR SELECT USING (true);

-- Allow anyone to insert registrations (for now, can be tightened later)
CREATE POLICY "Anyone can register for events" ON event_registrations
  FOR INSERT WITH CHECK (true);

-- Allow updates by user address matching (simple address-based auth)
CREATE POLICY "Users can update their own registrations by address" ON event_registrations
  FOR UPDATE USING (user_address = current_setting('request.headers', true)::json->>'user-address');

-- Allow deletes by user address matching (simple address-based auth)
CREATE POLICY "Users can cancel their own registrations by address" ON event_registrations
  FOR DELETE USING (user_address = current_setting('request.headers', true)::json->>'user-address');

-- Make sure RLS is enabled
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
