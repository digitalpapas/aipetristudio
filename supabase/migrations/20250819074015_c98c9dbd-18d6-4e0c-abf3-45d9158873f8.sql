-- Create analysis_jobs table for tracking analysis status
CREATE TABLE public.analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  research_id TEXT NOT NULL,
  segment_id NUMERIC NOT NULL,
  analysis_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for analysis_jobs
CREATE POLICY "Users can view their own analysis jobs" 
ON public.analysis_jobs 
FOR SELECT 
USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can insert their own analysis jobs" 
ON public.analysis_jobs 
FOR INSERT 
WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can update their own analysis jobs" 
ON public.analysis_jobs 
FOR UPDATE 
USING ((auth.uid())::text = user_id);

CREATE POLICY "System can update analysis jobs" 
ON public.analysis_jobs 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_analysis_jobs_updated_at
BEFORE UPDATE ON public.analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_analysis_jobs_user_research_segment ON public.analysis_jobs (user_id, research_id, segment_id);
CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs (status);

-- Enable realtime for analysis_jobs
ALTER TABLE public.analysis_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_jobs;