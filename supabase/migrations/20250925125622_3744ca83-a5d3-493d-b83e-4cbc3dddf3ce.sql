-- Enable realtime for researches and ensure full row data is available
ALTER TABLE public.researches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.researches;