-- Enhanced cleanup function that creates notifications when jobs timeout
CREATE OR REPLACE FUNCTION public.cleanup_stale_analysis_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  stale_job RECORD;
  display_name TEXT;
BEGIN
  -- Find and process each stale job to create notifications
  FOR stale_job IN 
    SELECT research_id, segment_id, analysis_type, user_id
    FROM public.analysis_jobs 
    WHERE status = 'pending' 
      AND started_at < now() - interval '5 minutes'
  LOOP
    -- Get human-readable analysis name
    SELECT public.get_analysis_display_name(stale_job.analysis_type) INTO display_name;
    
    -- Create error notification for this specific job
    PERFORM public.create_validated_notification(
      stale_job.user_id,
      'Анализ прерван',
      display_name || ' для сегмента ' || stale_job.segment_id || ' не завершился в установленное время. Попробуйте запустить анализ еще раз.',
      'system',
      '/dashboard/research/' || stale_job.research_id || '/segment/' || stale_job.segment_id,
      stale_job.research_id,
      stale_job.segment_id
    );
    
    RAISE LOG 'Created timeout notification for user % for analysis % in research % segment %', 
      stale_job.user_id, stale_job.analysis_type, stale_job.research_id, stale_job.segment_id;
  END LOOP;

  -- Update all stale jobs to failed status
  UPDATE public.analysis_jobs 
  SET status = 'failed',
      completed_at = now(),
      error_message = 'Timeout: Job exceeded maximum processing time (5 minutes)'
  WHERE status = 'pending' 
    AND started_at < now() - interval '5 minutes';
    
  RAISE LOG 'Cleaned up % stale analysis jobs', ROW_COUNT;
END;
$function$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup function to run every 2 minutes
SELECT cron.schedule(
  'cleanup-stale-analysis-jobs',
  '*/2 * * * *',
  'SELECT public.cleanup_stale_analysis_jobs();'
);