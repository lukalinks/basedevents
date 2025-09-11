-- Fix POA Schema - Add missing columns
-- Run this in Supabase SQL Editor if you already created the tables

-- Add missing columns to proof_of_attendance table
ALTER TABLE public.proof_of_attendance 
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.proof_of_attendance 
ADD COLUMN IF NOT EXISTS poa_type TEXT;

ALTER TABLE public.proof_of_attendance 
ADD COLUMN IF NOT EXISTS poa_metadata JSONB;

-- Update existing records to have issued_at = checked_in_at
UPDATE public.proof_of_attendance 
SET issued_at = checked_in_at 
WHERE issued_at IS NULL;

-- Create index on issued_at for better performance
CREATE INDEX IF NOT EXISTS idx_proof_of_attendance_issued_at ON public.proof_of_attendance(issued_at);
