-- Add unique constraint and foreign key relationships step by step

-- First, add unique constraint on researches Project ID (it should already be unique)
ALTER TABLE researches 
ADD CONSTRAINT uk_researches_project_id 
UNIQUE ("Project ID");

-- Clean up any orphaned records
DELETE FROM analysis_jobs 
WHERE research_id NOT IN (SELECT "Project ID" FROM researches);

DELETE FROM segments 
WHERE "Project ID" NOT IN (SELECT "Project ID" FROM researches);

DELETE FROM segment_analyses 
WHERE "Project ID" NOT IN (SELECT "Project ID" FROM researches);

-- Clean up orphaned analysis_jobs and segment_analyses without corresponding segments
DELETE FROM analysis_jobs 
WHERE NOT EXISTS (
  SELECT 1 FROM segments 
  WHERE segments."Project ID" = analysis_jobs.research_id 
  AND segments."Сегмент ID" = analysis_jobs.segment_id
);

DELETE FROM segment_analyses 
WHERE NOT EXISTS (
  SELECT 1 FROM segments 
  WHERE segments."Project ID" = segment_analyses."Project ID" 
  AND segments."Сегмент ID" = segment_analyses."Сегмент ID"
);

-- Add unique constraint on segments for composite key
ALTER TABLE segments 
ADD CONSTRAINT uk_segments_project_segment 
UNIQUE ("Project ID", "Сегмент ID");

-- Now add foreign key constraints
ALTER TABLE segments 
ADD CONSTRAINT fk_segments_research 
FOREIGN KEY ("Project ID") 
REFERENCES researches("Project ID") 
ON DELETE CASCADE;

ALTER TABLE segment_analyses 
ADD CONSTRAINT fk_segment_analyses_research 
FOREIGN KEY ("Project ID") 
REFERENCES researches("Project ID") 
ON DELETE CASCADE;

ALTER TABLE analysis_jobs 
ADD CONSTRAINT fk_analysis_jobs_research 
FOREIGN KEY (research_id) 
REFERENCES researches("Project ID") 
ON DELETE CASCADE;

ALTER TABLE analysis_jobs 
ADD CONSTRAINT fk_analysis_jobs_segment 
FOREIGN KEY (research_id, segment_id) 
REFERENCES segments("Project ID", "Сегмент ID") 
ON DELETE CASCADE;

ALTER TABLE segment_analyses 
ADD CONSTRAINT fk_segment_analyses_segment 
FOREIGN KEY ("Project ID", "Сегмент ID") 
REFERENCES segments("Project ID", "Сегмент ID") 
ON DELETE CASCADE;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments("Project ID");
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_research_id ON analysis_jobs(research_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_research_segment ON analysis_jobs(research_id, segment_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_segment_analyses_project_segment ON segment_analyses("Project ID", "Сегмент ID");
CREATE INDEX IF NOT EXISTS idx_segment_analyses_type ON segment_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_researches_user_id ON researches("User ID");
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);