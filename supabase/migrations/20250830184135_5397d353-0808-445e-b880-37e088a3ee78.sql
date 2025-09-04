-- Add title and description columns to top_segments table for better logging
ALTER TABLE public.top_segments 
ADD COLUMN title TEXT,
ADD COLUMN description TEXT;