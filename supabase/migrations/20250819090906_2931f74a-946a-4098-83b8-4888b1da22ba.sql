-- First, clean up ALL duplicate records, not just failed ones
-- Keep only the most recent record for each combination
DELETE FROM public.analysis_jobs a1
WHERE EXISTS (
  SELECT 1 FROM public.analysis_jobs a2
  WHERE a2.research_id = a1.research_id
    AND a2.segment_id = a1.segment_id
    AND a2.analysis_type = a1.analysis_type
    AND a2.status = a1.status
    AND a2.created_at > a1.created_at
);

-- Create a partial unique index to prevent duplicate active jobs
-- This allows multiple failed/completed jobs but prevents duplicate pending/processing
CREATE UNIQUE INDEX unique_active_analysis_idx 
ON public.analysis_jobs(research_id, segment_id, analysis_type)
WHERE status IN ('pending', 'processing');

-- Add performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_research_segment ON public.analysis_jobs(research_id, segment_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status ON public.analysis_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status_created ON public.analysis_jobs(status, created_at);

-- Check and add foreign key constraints for analysis_jobs only if they don't exist
DO $$ 
BEGIN 
    -- Add segment foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_analysis_jobs_segment' 
        AND table_name = 'analysis_jobs'
    ) THEN
        ALTER TABLE public.analysis_jobs
        ADD CONSTRAINT fk_analysis_jobs_segment 
        FOREIGN KEY (research_id, segment_id) 
        REFERENCES public.segments("Project ID", "Сегмент ID") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Drop the problematic "System can update analysis jobs" policy
DROP POLICY IF EXISTS "System can update analysis jobs" ON public.analysis_jobs;

-- Create a more secure system update policy that only allows webhook updates
CREATE POLICY "Webhook can update analysis jobs" 
ON public.analysis_jobs 
FOR UPDATE 
USING (
  -- Allow updates for pending/processing jobs or completion updates
  status IN ('pending', 'processing') OR
  -- Allow completion updates from webhooks by checking if research exists
  EXISTS (
    SELECT 1 FROM public.researches r 
    WHERE r."Project ID" = analysis_jobs.research_id
  )
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