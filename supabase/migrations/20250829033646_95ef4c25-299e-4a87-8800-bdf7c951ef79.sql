-- Remove the "User Email" column from FileStorage table for security reasons
-- This column contains PII that is not needed for application functionality
-- User identification is already handled via "User ID" column

ALTER TABLE public.FileStorage 
DROP COLUMN IF EXISTS "User Email";

-- Update table comment to reflect security improvement
COMMENT ON TABLE public.FileStorage IS 'Stores file storage information without PII for enhanced security';

-- Add indices for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_filestorage_user_id ON public.FileStorage ("User ID");
CREATE INDEX IF NOT EXISTS idx_filestorage_project_id ON public.FileStorage (project_id);