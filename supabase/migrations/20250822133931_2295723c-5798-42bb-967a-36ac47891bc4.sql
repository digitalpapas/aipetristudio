-- Add generated_segments field to temporarily store generated segments before user selection
ALTER TABLE public.researches 
ADD COLUMN generated_segments jsonb;