-- Add token gating support to events table

-- Add token gating columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_token_gated BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_address VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_balance DECIMAL(20,8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_symbol VARCHAR(10);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS token_gate_type VARCHAR(20) DEFAULT 'ERC20';
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_nft_collection VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_nft_count INTEGER DEFAULT 1;

-- Create token verifications table
CREATE TABLE IF NOT EXISTS token_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_address VARCHAR(255) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  token_balance DECIMAL(20,8) NOT NULL,
  verification_status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'pending'
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS events_token_gated_idx ON events(is_token_gated);
CREATE INDEX IF NOT EXISTS token_verifications_event_user_idx ON token_verifications(event_id, user_address);
CREATE INDEX IF NOT EXISTS token_verifications_status_idx ON token_verifications(verification_status);

-- Enable RLS on token_verifications table
ALTER TABLE token_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for token_verifications table
CREATE POLICY "Token verifications are viewable by everyone" ON token_verifications
  FOR SELECT USING (true);

CREATE POLICY "Users can create token verifications" ON token_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own token verifications" ON token_verifications
  FOR UPDATE USING (user_address = current_setting('request.jwt.claims', true)::json->>'sub');
