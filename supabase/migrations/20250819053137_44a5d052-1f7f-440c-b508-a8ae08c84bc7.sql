-- Add status field to researches table
ALTER TABLE researches ADD COLUMN status TEXT DEFAULT 'generating';

-- Create index for better performance on status queries
CREATE INDEX idx_researches_status ON researches(status);

-- Update existing records based on available data
-- If description contains error text, mark as error
UPDATE researches 
SET status = 'error' 
WHERE description LIKE '%Error occurred%' OR description LIKE '%error%';

-- If research has segments, mark as completed
UPDATE researches 
SET status = 'completed' 
WHERE "Project ID" IN (
  SELECT DISTINCT "Project ID" 
  FROM segments 
  WHERE segments."Project ID" = researches."Project ID"
) AND status = 'generating';

-- All others remain as 'generating' (default)