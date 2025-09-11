-- Add proof of attendance system for events
-- Migration: 015_add_proof_of_attendance.sql

-- Create proof_of_attendance table for tracking POAs
CREATE TABLE IF NOT EXISTS proof_of_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  attendee_address VARCHAR(255) NOT NULL,
  attendee_name VARCHAR(255),
  
  -- POA status and metadata
  status VARCHAR(20) DEFAULT 'pending', -- pending, issued, claimed, revoked
  poa_type VARCHAR(20) DEFAULT 'digital', -- digital, nft, both
  
  -- Check-in information
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by VARCHAR(255), -- Event organizer who confirmed attendance
  check_in_method VARCHAR(20) DEFAULT 'manual', -- manual, qr_code, geolocation, nfc
  check_in_location VARCHAR(500), -- Optional location where check-in occurred
  
  -- Digital POA data
  poa_title VARCHAR(255),
  poa_description TEXT,
  poa_image_url TEXT,
  poa_metadata JSONB, -- Store additional POA metadata
  
  -- NFT POA data (if minted as NFT)
  nft_contract_address VARCHAR(42),
  nft_token_id NUMERIC,
  nft_tx_hash VARCHAR(66),
  nft_metadata_uri TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  issued_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(event_id, attendee_address)
);

-- Create event_check_in_settings table for event-specific POA configuration
CREATE TABLE IF NOT EXISTS event_check_in_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  
  -- Check-in configuration
  check_in_enabled BOOLEAN DEFAULT true,
  check_in_window_start TIMESTAMP WITH TIME ZONE, -- When check-in opens (default: event start - 1 hour)
  check_in_window_end TIMESTAMP WITH TIME ZONE,   -- When check-in closes (default: event end + 1 hour)
  require_geolocation BOOLEAN DEFAULT false,
  allowed_check_in_radius INTEGER DEFAULT 100, -- meters
  event_latitude DECIMAL(10, 8),
  event_longitude DECIMAL(11, 8),
  
  -- POA configuration
  auto_issue_poa BOOLEAN DEFAULT true, -- Auto-issue POA after check-in
  poa_template_title VARCHAR(255),
  poa_template_description TEXT,
  poa_template_image_url TEXT,
  poa_custom_metadata JSONB,
  
  -- NFT POA configuration
  enable_nft_poa BOOLEAN DEFAULT false,
  nft_contract_address VARCHAR(42),
  nft_base_uri TEXT,
  nft_collection_name VARCHAR(255),
  nft_collection_symbol VARCHAR(10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create poa_templates table for reusable POA designs
CREATE TABLE IF NOT EXISTS poa_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_address VARCHAR(255) NOT NULL,
  
  -- Template information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'general', -- general, tech, art, music, sports, etc.
  
  -- Template design
  template_image_url TEXT,
  template_metadata JSONB,
  background_color VARCHAR(7) DEFAULT '#ffffff',
  text_color VARCHAR(7) DEFAULT '#000000',
  accent_color VARCHAR(7) DEFAULT '#3b82f6',
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false, -- Can others use this template?
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE proof_of_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_check_in_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE poa_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proof_of_attendance
CREATE POLICY "POAs are viewable by attendees and event creators" ON proof_of_attendance
  FOR SELECT USING (
    attendee_address = current_setting('request.jwt.claims', true)::json->>'sub' OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = proof_of_attendance.event_id 
      AND events.creator = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Event creators can create POAs" ON proof_of_attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = proof_of_attendance.event_id 
      AND events.creator = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Event creators can update POAs for their events" ON proof_of_attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = proof_of_attendance.event_id 
      AND events.creator = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Event creators can delete POAs for their events" ON proof_of_attendance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = proof_of_attendance.event_id 
      AND events.creator = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- RLS Policies for event_check_in_settings
CREATE POLICY "Check-in settings viewable by everyone" ON event_check_in_settings
  FOR SELECT USING (true);

CREATE POLICY "Event creators can manage check-in settings" ON event_check_in_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_check_in_settings.event_id 
      AND events.creator = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- RLS Policies for poa_templates
CREATE POLICY "Public templates viewable by everyone" ON poa_templates
  FOR SELECT USING (is_public = true OR creator_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create templates" ON poa_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own templates" ON poa_templates
  FOR UPDATE USING (creator_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own templates" ON poa_templates
  FOR DELETE USING (creator_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- Performance indexes
CREATE INDEX IF NOT EXISTS proof_of_attendance_event_id_idx ON proof_of_attendance(event_id);
CREATE INDEX IF NOT EXISTS proof_of_attendance_attendee_address_idx ON proof_of_attendance(attendee_address);
CREATE INDEX IF NOT EXISTS proof_of_attendance_status_idx ON proof_of_attendance(status);
CREATE INDEX IF NOT EXISTS proof_of_attendance_checked_in_at_idx ON proof_of_attendance(checked_in_at);
CREATE INDEX IF NOT EXISTS proof_of_attendance_nft_contract_idx ON proof_of_attendance(nft_contract_address);

CREATE INDEX IF NOT EXISTS event_check_in_settings_event_id_idx ON event_check_in_settings(event_id);
CREATE INDEX IF NOT EXISTS poa_templates_creator_idx ON poa_templates(creator_address);
CREATE INDEX IF NOT EXISTS poa_templates_category_idx ON poa_templates(category);
CREATE INDEX IF NOT EXISTS poa_templates_public_idx ON poa_templates(is_public);

-- Trigger to automatically update updated_at for all tables
CREATE TRIGGER update_proof_of_attendance_updated_at 
    BEFORE UPDATE ON proof_of_attendance 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_check_in_settings_updated_at 
    BEFORE UPDATE ON event_check_in_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poa_templates_updated_at 
    BEFORE UPDATE ON poa_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for POA statistics
CREATE OR REPLACE VIEW poa_event_stats AS
SELECT 
  e.id as event_id,
  e.title as event_title,
  e.creator as event_creator,
  e.date as event_date,
  COUNT(poa.id) as total_poas_issued,
  COUNT(CASE WHEN poa.status = 'claimed' THEN 1 END) as poas_claimed,
  COUNT(CASE WHEN poa.status = 'pending' THEN 1 END) as poas_pending,
  COUNT(CASE WHEN poa.nft_token_id IS NOT NULL THEN 1 END) as nft_poas_minted,
  COUNT(CASE WHEN poa.checked_in_at IS NOT NULL THEN 1 END) as attendees_checked_in,
  ROUND(
    CASE 
      WHEN COUNT(poa.id) > 0 
      THEN (COUNT(CASE WHEN poa.status = 'claimed' THEN 1 END)::decimal / COUNT(poa.id) * 100)
      ELSE 0 
    END, 2
  ) as claim_rate_percentage
FROM events e
LEFT JOIN proof_of_attendance poa ON e.id = poa.event_id
GROUP BY e.id, e.title, e.creator, e.date;

-- Insert some default POA templates
INSERT INTO poa_templates (creator_address, name, description, category, template_metadata, is_public) VALUES
  ('system', 'Tech Meetup Default', 'Standard template for technology meetups and conferences', 'tech', 
   '{"layout": "standard", "style": "modern", "showEventDetails": true, "showDate": true, "showLocation": true}', true),
  ('system', 'Art Gallery Opening', 'Elegant template for art events and gallery openings', 'art',
   '{"layout": "elegant", "style": "artistic", "showEventDetails": true, "showDate": true, "showArtist": true}', true),
  ('system', 'Music Concert', 'Vibrant template for concerts and music events', 'music',
   '{"layout": "vibrant", "style": "musical", "showEventDetails": true, "showDate": true, "showVenue": true}', true),
  ('system', 'Workshop Completion', 'Certificate-style template for educational workshops', 'education',
   '{"layout": "certificate", "style": "formal", "showEventDetails": true, "showDate": true, "showInstructor": true}', true),
  ('system', 'Community Gathering', 'Friendly template for community events and social gatherings', 'community',
   '{"layout": "friendly", "style": "casual", "showEventDetails": true, "showDate": true, "showCommunity": true}', true)
ON CONFLICT DO NOTHING;
