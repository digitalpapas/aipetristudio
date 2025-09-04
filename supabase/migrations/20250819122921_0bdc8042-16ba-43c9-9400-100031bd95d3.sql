-- Remove the cleanup_stale_analysis_jobs function since we no longer use analysis_jobs table
DROP FUNCTION IF EXISTS public.cleanup_stale_analysis_jobs();