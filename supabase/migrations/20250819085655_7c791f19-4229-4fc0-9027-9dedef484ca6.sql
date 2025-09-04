-- Add foreign key constraints and improve database relationships

-- First, ensure data consistency by cleaning up any orphaned records
DELETE FROM analysis_jobs 
WHERE research_id NOT IN (SELECT "Project ID" FROM researches);

DELETE FROM segments 
WHERE "Project ID" NOT IN (SELECT "Project ID" FROM researches);

DELETE FROM segment_analyses 
WHERE "Project ID" NOT IN (SELECT "Project ID" FROM researches);

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

-- Add foreign key constraints
-- Link segments to researches
ALTER TABLE segments 
ADD CONSTRAINT fk_segments_research 
FOREIGN KEY ("Project ID") 
REFERENCES researches("Project ID") 
ON DELETE CASCADE;

-- Link segment_analyses to researches
ALTER TABLE segment_analyses 
ADD CONSTRAINT fk_segment_analyses_research 
FOREIGN KEY ("Project ID") 
REFERENCES researches("Project ID") 
ON DELETE CASCADE;

-- Link analysis_jobs to researches
ALTER TABLE analysis_jobs 
ADD CONSTRAINT fk_analysis_jobs_research 
FOREIGN KEY (research_id) 
REFERENCES researches("Project ID") 
ON DELETE CASCADE;

-- Add composite foreign key for analysis_jobs to segments
-- First create a unique constraint on segments for the composite key
ALTER TABLE segments 
ADD CONSTRAINT uk_segments_project_segment 
UNIQUE ("Project ID", "Сегмент ID");

-- Now add the foreign key constraint
ALTER TABLE analysis_jobs 
ADD CONSTRAINT fk_analysis_jobs_segment 
FOREIGN KEY (research_id, segment_id) 
REFERENCES segments("Project ID", "Сегмент ID") 
ON DELETE CASCADE;

-- Add composite foreign key for segment_analyses to segments
ALTER TABLE segment_analyses 
ADD CONSTRAINT fk_segment_analyses_segment 
FOREIGN KEY ("Project ID", "Сегмент ID") 
REFERENCES segments("Project ID", "Сегмент ID") 
ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments("Project ID");
CREATE INDEX IF NOT EXISTS idx_segments_project_segment ON segments("Project ID", "Сегмент ID");
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_research_id ON analysis_jobs(research_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_research_segment ON analysis_jobs(research_id, segment_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_segment_analyses_project_id ON segment_analyses("Project ID");
CREATE INDEX IF NOT EXISTS idx_segment_analyses_project_segment ON segment_analyses("Project ID", "Сегмент ID");
CREATE INDEX IF NOT EXISTS idx_segment_analyses_type ON segment_analyses(analysis_type);

-- Add indexes for user-based queries
CREATE INDEX IF NOT EXISTS idx_researches_user_id ON researches("User ID");
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_research_segment ON analysis_jobs(user_id, research_id, segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_analyses_project_segment_type ON segment_analyses("Project ID", "Сегмент ID", analysis_type);