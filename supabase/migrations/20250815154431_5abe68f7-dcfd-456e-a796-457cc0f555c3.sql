-- Enable Row Level Security on the qa table
ALTER TABLE public.qa ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only view their own data
CREATE POLICY "Users can view their own qa records" 
ON public.qa 
FOR SELECT 
TO authenticated
USING (auth.uid()::text = "User ID");

-- Create policy for users to insert their own data
CREATE POLICY "Users can insert their own qa records" 
ON public.qa 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = "User ID");

-- Create policy for users to update their own data
CREATE POLICY "Users can update their own qa records" 
ON public.qa 
FOR UPDATE 
TO authenticated
USING (auth.uid()::text = "User ID")
WITH CHECK (auth.uid()::text = "User ID");

-- Create policy for users to delete their own data
CREATE POLICY "Users can delete their own qa records" 
ON public.qa 
FOR DELETE 
TO authenticated
USING (auth.uid()::text = "User ID");