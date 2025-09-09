-- ============================================
-- ADD MISSING POLICIES AND INDEXES FOR SUPPORT TABLE
-- (Run this if you already have your database set up)
-- ============================================

-- 1. Enable Row Level Security on event_support table
ALTER TABLE event_support ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for event_support table
CREATE POLICY "Support transactions are viewable by everyone" ON event_support
  FOR SELECT USING (true);

CREATE POLICY "Users can create support transactions" ON event_support
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update support transaction status" ON event_support
  FOR UPDATE USING (true);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS event_support_event_id_idx ON event_support(event_id);
CREATE INDEX IF NOT EXISTS event_support_supporter_address_idx ON event_support(supporter_address);
CREATE INDEX IF NOT EXISTS event_support_host_address_idx ON event_support(host_address);
CREATE INDEX IF NOT EXISTS event_support_tx_hash_idx ON event_support(tx_hash);
CREATE INDEX IF NOT EXISTS event_support_status_idx ON event_support(status);
CREATE INDEX IF NOT EXISTS event_support_created_at_idx ON event_support(created_at);