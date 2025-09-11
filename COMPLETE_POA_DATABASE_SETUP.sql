-- COMPLETE POA DATABASE SETUP
-- This script will create all POA tables and fix any existing issues
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS public.proof_of_attendance CASCADE;
DROP TABLE IF EXISTS public.event_check_in_settings CASCADE;
DROP TABLE IF EXISTS public.poa_templates CASCADE;

-- Create proof_of_attendance table with complete schema
CREATE TABLE public.proof_of_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    attendee_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'claimed', 'revoked')),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    poa_title TEXT,
    poa_description TEXT,
    poa_image_url TEXT,
    poa_type TEXT,
    poa_metadata JSONB,
    nft_tx_hash TEXT,
    nft_token_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_check_in_settings table
CREATE TABLE public.event_check_in_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    check_in_enabled BOOLEAN DEFAULT false,
    check_in_start_time TIMESTAMP WITH TIME ZONE,
    check_in_end_time TIMESTAMP WITH TIME ZONE,
    require_geolocation BOOLEAN DEFAULT false,
    geolocation_radius INTEGER DEFAULT 100,
    auto_issue_poa BOOLEAN DEFAULT true,
    poa_title TEXT,
    poa_description TEXT,
    poa_image_url TEXT,
    nft_contract_address TEXT,
    poa_template_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id)
);

-- Create poa_templates table
CREATE TABLE public.poa_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    template_image_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_proof_of_attendance_event_id ON public.proof_of_attendance(event_id);
CREATE INDEX idx_proof_of_attendance_attendee ON public.proof_of_attendance(attendee_address);
CREATE INDEX idx_proof_of_attendance_status ON public.proof_of_attendance(status);
CREATE INDEX idx_proof_of_attendance_issued_at ON public.proof_of_attendance(issued_at);
CREATE INDEX idx_event_check_in_settings_event_id ON public.event_check_in_settings(event_id);

-- Enable Row Level Security
ALTER TABLE public.proof_of_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_check_in_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poa_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for proof_of_attendance
CREATE POLICY "Users can view their own POAs" ON public.proof_of_attendance
    FOR SELECT USING (attendee_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Event creators can view POAs for their events" ON public.proof_of_attendance
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE creator = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Event creators can insert POAs for their events" ON public.proof_of_attendance
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM public.events 
            WHERE creator = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Event creators can update POAs for their events" ON public.proof_of_attendance
    FOR UPDATE USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE creator = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Create RLS policies for event_check_in_settings
CREATE POLICY "Event creators can manage check-in settings" ON public.event_check_in_settings
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE creator = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Create RLS policies for poa_templates
CREATE POLICY "Anyone can view public templates" ON public.poa_templates
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own templates" ON public.poa_templates
    FOR SELECT USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create templates" ON public.poa_templates
    FOR INSERT WITH CHECK (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own templates" ON public.poa_templates
    FOR UPDATE USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

-- Insert default POA templates
INSERT INTO public.poa_templates (name, category, template_image_url, is_public) VALUES
('Conference Badge', 'Conference', '/logo.png', true),
('Workshop Certificate', 'Workshop', '/logo.png', true),
('Meetup Badge', 'Meetup', '/logo.png', true),
('Hackathon Winner', 'Hackathon', '/logo.png', true),
('VIP Event', 'VIP', '/logo.png', true),
('Community Event', 'Community', '/logo.png', true),
('Tech Talk', 'Tech', '/logo.png', true),
('Networking Event', 'Networking', '/logo.png', true)
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_proof_of_attendance_updated_at 
    BEFORE UPDATE ON public.proof_of_attendance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_check_in_settings_updated_at 
    BEFORE UPDATE ON public.event_check_in_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.proof_of_attendance TO authenticated;
GRANT ALL ON public.event_check_in_settings TO authenticated;
GRANT ALL ON public.poa_templates TO authenticated;

-- Verify tables were created
SELECT 'POA tables created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%poa%' OR table_name LIKE '%check_in%';
