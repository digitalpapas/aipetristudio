-- Enable realtime for segment_analyses table
ALTER TABLE public.segment_analyses REPLICA IDENTITY FULL;

-- Add segment_analyses to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.segment_analyses;