-- Create table for storing converted files
CREATE TABLE IF NOT EXISTS public.converted_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_type TEXT,
  text_content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.converted_files ENABLE ROW LEVEL SECURITY;

-- Create policies for converted_files
CREATE POLICY "Users can view their own converted files" 
ON public.converted_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own converted files" 
ON public.converted_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own converted files" 
ON public.converted_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own converted files" 
ON public.converted_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_converted_files_updated_at
BEFORE UPDATE ON public.converted_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_converted_files_research_id ON public.converted_files(research_id);
CREATE INDEX IF NOT EXISTS idx_converted_files_user_id ON public.converted_files(user_id);