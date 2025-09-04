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

-- Now add the unique constraint, but only for pending/processing status to prevent duplicates
-- Failed jobs can have multiple entries for history
ALTER TABLE public.analysis_jobs
ADD CONSTRAINT unique_active_analysis 
UNIQUE (research_id, segment_id, analysis_type)
WHERE (status IN ('pending', 'processing'));

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