-- Add image_url column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update RLS policies to allow image_url updates
-- (The existing policies should already cover this, but this ensures it works)

-- Create storage bucket for event images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for event images
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public read access for event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;

-- Create storage policies
CREATE POLICY "Public read access for event images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update event images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete event images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');
