-- Create function to automatically mark old pending jobs as failed
CREATE OR REPLACE FUNCTION public.cleanup_stale_analysis_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.analysis_jobs 
  SET status = 'failed',
      completed_at = now(),
      error_message = 'Timeout: Job exceeded maximum processing time'
  WHERE status = 'pending' 
    AND started_at < now() - interval '10 minutes';
END;
$$;