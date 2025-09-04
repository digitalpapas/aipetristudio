-- Remove the redundant "Ответ бота" column from segment_analyses table
-- We'll use only the content (JSONB) column for storing analysis data
ALTER TABLE public.segment_analyses DROP COLUMN IF EXISTS "Ответ бота";