-- Update cleanup function to use 5 minute timeout instead of 10
CREATE OR REPLACE FUNCTION public.cleanup_stale_analysis_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.analysis_jobs 
  SET status = 'failed',
      completed_at = now(),
      error_message = 'Timeout: Job exceeded maximum processing time (5 minutes)'
  WHERE status = 'pending' 
    AND started_at < now() - interval '5 minutes';
END;
$function$;

-- Clean up any current stuck analysis
UPDATE public.analysis_jobs 
SET status = 'failed',
    completed_at = now(),
    error_message = 'Timeout: Job exceeded maximum processing time (5 minutes)'
WHERE status = 'pending' 
  AND started_at < now() - interval '5 minutes';