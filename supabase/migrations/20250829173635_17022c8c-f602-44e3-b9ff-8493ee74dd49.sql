-- Create table for enterprise inquiries
CREATE TABLE public.enterprise_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  team_size text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all inquiries
CREATE POLICY "Admins can view all enterprise inquiries" 
ON public.enterprise_inquiries 
FOR SELECT 
USING (auth.role() = 'service_role');

-- Create policy for users to insert their own inquiries
CREATE POLICY "Users can submit enterprise inquiries" 
ON public.enterprise_inquiries 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_enterprise_inquiries_updated_at
BEFORE UPDATE ON public.enterprise_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();