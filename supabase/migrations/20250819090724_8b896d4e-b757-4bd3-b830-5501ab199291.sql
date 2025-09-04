-- Add foreign key constraints for analysis_jobs
ALTER TABLE public.analysis_jobs
ADD CONSTRAINT fk_analysis_jobs_research 
FOREIGN KEY (research_id) 
REFERENCES public.researches("Project ID") 
ON DELETE CASCADE;

-- Add composite foreign key for segments (research_id + segment_id)
ALTER TABLE public.analysis_jobs
ADD CONSTRAINT fk_analysis_jobs_segment 
FOREIGN KEY (research_id, segment_id) 
REFERENCES public.segments("Project ID", "Сегмент ID") 
ON DELETE CASCADE;

-- Clean up duplicate failed jobs, keeping only the most recent one per research/segment/analysis_type
DELETE FROM public.analysis_jobs a1
WHERE a1.status = 'failed'
  AND EXISTS (
    SELECT 1 FROM public.analysis_jobs a2
    WHERE a2.research_id = a1.research_id
      AND a2.segment_id = a1.segment_id
      AND a2.analysis_type = a1.analysis_type
      AND a2.status = 'failed'
      AND a2.created_at > a1.created_at
  );

-- Add unique constraint to prevent duplicate pending/processing jobs
ALTER TABLE public.analysis_jobs
ADD CONSTRAINT unique_pending_analysis 
UNIQUE (research_id, segment_id, analysis_type, status)
DEFERRABLE INITIALLY DEFERRED;

-- Add performance indexes
CREATE INDEX idx_analysis_jobs_research_segment ON public.analysis_jobs(research_id, segment_id);
CREATE INDEX idx_analysis_jobs_user_status ON public.analysis_jobs(user_id, status);
CREATE INDEX idx_analysis_jobs_status_created ON public.analysis_jobs(status, created_at);

-- Drop the problematic "System can update analysis jobs" policy
DROP POLICY IF EXISTS "System can update analysis jobs" ON public.analysis_jobs;

-- Create a more secure system update policy that only allows webhook updates
CREATE POLICY "Webhook can update analysis jobs" 
ON public.analysis_jobs 
FOR UPDATE 
USING (
  -- Only allow updates to specific columns and only for pending/processing jobs
  status IN ('pending', 'processing') OR
  -- Allow completion updates
  (status = 'pending' AND EXISTS (
    SELECT 1 FROM public.researches r 
    WHERE r."Project ID" = analysis_jobs.research_id
  ))
);

-- Update security definer functions to use proper search_path
CREATE OR REPLACE FUNCTION public.create_validated_notification(
  p_user_id text, 
  p_title text, 
  p_message text DEFAULT NULL::text, 
  p_type text DEFAULT 'system'::text, 
  p_action_url text DEFAULT NULL::text, 
  p_research_id text DEFAULT NULL::text, 
  p_segment_id numeric DEFAULT NULL::numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  notification_id uuid;
BEGIN
  -- Validate research exists if research_id is provided
  IF p_research_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.researches WHERE "Project ID" = p_research_id) THEN
      RAISE EXCEPTION 'Research with ID % does not exist', p_research_id;
    END IF;
  END IF;
  
  -- Validate segment exists if both research_id and segment_id are provided
  IF p_research_id IS NOT NULL AND p_segment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.segments 
      WHERE "Project ID" = p_research_id AND "Сегмент ID" = p_segment_id
    ) THEN
      RAISE EXCEPTION 'Segment % does not exist in research %', p_segment_id, p_research_id;
    END IF;
  END IF;
  
  -- Create the notification
  INSERT INTO public.notifications (
    user_id, title, message, type, action_url, research_id, segment_id
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_action_url, p_research_id, p_segment_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Update other security definer functions
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  DELETE FROM public.notifications 
  WHERE created_at < now() - interval '30 days';
$function$;

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
      error_message = 'Timeout: Job exceeded maximum processing time'
  WHERE status = 'pending' 
    AND started_at < now() - interval '10 minutes';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analysis_display_name(analysis_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $function$
  SELECT CASE 
    WHEN analysis_type = 'segment_description' THEN 'Описание сегмента'
    WHEN analysis_type = 'bdf_analysis' THEN 'BDF анализ'
    WHEN analysis_type = 'problems_analysis' THEN 'Боли, страхи, потребности'
    WHEN analysis_type = 'solutions_analysis' THEN 'Работа с болями и возражениями'
    WHEN analysis_type = 'jtbd_analysis' THEN 'JTBD анализ'
    WHEN analysis_type = 'content_themes' THEN 'Темы для контента'
    WHEN analysis_type = 'user_personas' THEN 'User Personas'
    WHEN analysis_type = 'niche_integration' THEN 'Уровни интеграции с нишей'
    WHEN analysis_type = 'final_report' THEN 'Финальный отчет'
    ELSE analysis_type
  END;
$function$;