-- Add status column to track analysis progress
ALTER TABLE public.segment_analyses
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

-- Helpful index for lookups by project/segment/type/status
CREATE INDEX IF NOT EXISTS idx_segment_analyses_project_segment_type_status
ON public.segment_analyses ("Project ID", "Сегмент ID", analysis_type, status);
