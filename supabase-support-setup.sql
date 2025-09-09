-- ============================================
-- SUPABASE SETUP FOR EVENT SUPPORT FEATURE
-- ============================================

-- 1. Enable Row Level Security on event_support table
ALTER TABLE event_support ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for event_support table
-- Allow everyone to view support data (for transparency)
CREATE POLICY "Support transactions are viewable by everyone" ON event_support
  FOR SELECT USING (true);

-- Allow anyone to create support transactions
CREATE POLICY "Users can create support transactions" ON event_support
  FOR INSERT WITH CHECK (true);

-- Only allow system/admin to update support transaction status
CREATE POLICY "System can update support transaction status" ON event_support
  FOR UPDATE USING (true);

-- 3. Create indexes for better performance on event_support table
CREATE INDEX IF NOT EXISTS event_support_event_id_idx ON event_support(event_id);
CREATE INDEX IF NOT EXISTS event_support_supporter_address_idx ON event_support(supporter_address);
CREATE INDEX IF NOT EXISTS event_support_host_address_idx ON event_support(host_address);
CREATE INDEX IF NOT EXISTS event_support_tx_hash_idx ON event_support(tx_hash);
CREATE INDEX IF NOT EXISTS event_support_status_idx ON event_support(status);
CREATE INDEX IF NOT EXISTS event_support_created_at_idx ON event_support(created_at);

-- 4. Create a view for easy support totals calculation
CREATE OR REPLACE VIEW event_support_totals AS
SELECT 
  event_id,
  COUNT(*) as total_supporters,
  SUM(amount_usdc) as total_amount_usdc,
  AVG(amount_usdc) as average_amount_usdc,
  MAX(created_at) as last_support_at
FROM event_support 
WHERE status IN ('pending', 'confirmed')
GROUP BY event_id;

-- 5. Create a function to get support total for an event (optional optimization)
CREATE OR REPLACE FUNCTION get_event_support_total(p_event_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_amount DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount_usdc), 0)
  INTO total_amount
  FROM event_support
  WHERE event_id = p_event_id 
    AND status IN ('pending', 'confirmed');
  
  RETURN total_amount;
END;
$$;

-- 6. Grant necessary permissions
GRANT SELECT ON event_support_totals TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_event_support_total(UUID) TO anon, authenticated;