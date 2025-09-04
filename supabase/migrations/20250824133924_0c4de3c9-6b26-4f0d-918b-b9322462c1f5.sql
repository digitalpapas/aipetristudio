-- Check if segmentsCount column exists, and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'researches' 
                   AND column_name = 'segmentsCount') THEN
        ALTER TABLE public.researches 
        ADD COLUMN "segmentsCount" integer DEFAULT 0;
    END IF;
END $$;