-- Create table for storing top segments from AI analysis
CREATE TABLE public.top_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  segment_id integer NOT NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 3),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, rank),
  UNIQUE(project_id, segment_id)
);

-- Enable Row Level Security
ALTER TABLE public.top_segments ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view top segments of their researches" 
ON public.top_segments 
FOR SELECT 
USING (project_id IN (
  SELECT researches."Project ID"
  FROM researches
  WHERE researches."User ID" = (auth.uid())::text
));

CREATE POLICY "Users can insert top segments for their researches" 
ON public.top_segments 
FOR INSERT 
WITH CHECK (project_id IN (
  SELECT researches."Project ID"
  FROM researches
  WHERE researches."User ID" = (auth.uid())::text
));

CREATE POLICY "Users can update top segments of their researches" 
ON public.top_segments 
FOR UPDATE 
USING (project_id IN (
  SELECT researches."Project ID"
  FROM researches
  WHERE researches."User ID" = (auth.uid())::text
));

CREATE POLICY "Users can delete top segments of their researches" 
ON public.top_segments 
FOR DELETE 
USING (project_id IN (
  SELECT researches."Project ID"
  FROM researches
  WHERE researches."User ID" = (auth.uid())::text
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_top_segments_updated_at
BEFORE UPDATE ON public.top_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();