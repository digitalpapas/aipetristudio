-- Ensure converted_files table exists with proper structure and RLS
CREATE TABLE IF NOT EXISTS public.converted_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_type TEXT,
  text_content TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_converted_files_research_id ON public.converted_files(research_id);

-- Enable RLS
ALTER TABLE public.converted_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their own converted files" 
ON public.converted_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own converted files" 
ON public.converted_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own converted files" 
ON public.converted_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own converted files" 
ON public.converted_files 
FOR DELETE 
USING (auth.uid() = user_id);