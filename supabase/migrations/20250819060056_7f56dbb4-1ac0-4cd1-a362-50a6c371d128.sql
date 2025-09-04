-- Add created_at and updated_at columns to researches table
ALTER TABLE public.researches 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_researches_updated_at
BEFORE UPDATE ON public.researches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();