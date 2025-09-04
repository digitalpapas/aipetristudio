-- Add missing columns to top_segments table for enhanced AI analysis
ALTER TABLE public.top_segments 
ADD COLUMN IF NOT EXISTS full_analysis TEXT,
ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- Update the existing top_segments data if any exists
UPDATE public.top_segments 
SET reasoning = description 
WHERE reasoning IS NULL AND description IS NOT NULL;