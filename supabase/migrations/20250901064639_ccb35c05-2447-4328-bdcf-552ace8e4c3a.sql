-- Add problems and message columns to segments table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'segments' AND column_name = 'problems') THEN
        ALTER TABLE public.segments ADD COLUMN problems TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'segments' AND column_name = 'message') THEN
        ALTER TABLE public.segments ADD COLUMN message TEXT;
    END IF;
END $$;