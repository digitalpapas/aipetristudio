-- Add project_id column to FileStorage table
ALTER TABLE public."FileStorage" 
ADD COLUMN project_id text;

-- Update existing records to link with researches based on "Project name"
-- First, let's try to match by project name where possible
UPDATE public."FileStorage" 
SET project_id = r."Project ID"
FROM public.researches r 
WHERE "FileStorage"."Project name" = r."Project name" 
AND "FileStorage"."User ID" = r."User ID";

-- Clean up any orphaned records that couldn't be matched
DELETE FROM public."FileStorage" 
WHERE project_id IS NULL;

-- Make project_id NOT NULL after cleanup
ALTER TABLE public."FileStorage" 
ALTER COLUMN project_id SET NOT NULL;

-- Add foreign key constraint with cascade delete
ALTER TABLE public."FileStorage"
ADD CONSTRAINT fk_filestorage_research 
FOREIGN KEY (project_id) 
REFERENCES public.researches("Project ID") 
ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX idx_filestorage_project_id ON public."FileStorage"(project_id);
CREATE INDEX idx_filestorage_user_id ON public."FileStorage"("User ID");

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own qa records" ON public."FileStorage";
DROP POLICY IF EXISTS "Users can insert their own qa records" ON public."FileStorage";
DROP POLICY IF EXISTS "Users can update their own qa records" ON public."FileStorage";
DROP POLICY IF EXISTS "Users can delete their own qa records" ON public."FileStorage";

-- Create new RLS policies that properly check research ownership
CREATE POLICY "Users can view files from their researches" 
ON public."FileStorage" 
FOR SELECT 
USING (
  project_id IN (
    SELECT "Project ID" 
    FROM public.researches 
    WHERE "User ID" = (auth.uid())::text
  )
);

CREATE POLICY "Users can insert files for their researches" 
ON public."FileStorage" 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT "Project ID" 
    FROM public.researches 
    WHERE "User ID" = (auth.uid())::text
  )
  AND (auth.uid())::text = "User ID"
);

CREATE POLICY "Users can update files from their researches" 
ON public."FileStorage" 
FOR UPDATE 
USING (
  project_id IN (
    SELECT "Project ID" 
    FROM public.researches 
    WHERE "User ID" = (auth.uid())::text
  )
)
WITH CHECK (
  project_id IN (
    SELECT "Project ID" 
    FROM public.researches 
    WHERE "User ID" = (auth.uid())::text
  )
  AND (auth.uid())::text = "User ID"
);

CREATE POLICY "Users can delete files from their researches" 
ON public."FileStorage" 
FOR DELETE 
USING (
  project_id IN (
    SELECT "Project ID" 
    FROM public.researches 
    WHERE "User ID" = (auth.uid())::text
  )
);