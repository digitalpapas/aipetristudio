-- Add research_id and segment_id to notifications table for better linking
ALTER TABLE public.notifications 
ADD COLUMN research_id text,
ADD COLUMN segment_id numeric;

-- Create index for better performance when querying notifications by research
CREATE INDEX idx_notifications_research_segment 
ON public.notifications (research_id, segment_id);

-- Update the notification creation function to include more context
CREATE OR REPLACE FUNCTION public.get_analysis_display_name(analysis_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN analysis_type = 'segment_description' THEN 'Описание сегмента'
    WHEN analysis_type = 'bdf_analysis' THEN 'BDF анализ'
    WHEN analysis_type = 'problems_analysis' THEN 'Боли, страхи, потребности'
    WHEN analysis_type = 'solutions_analysis' THEN 'Работа с болями и возражениями'
    WHEN analysis_type = 'jtbd_analysis' THEN 'JTBD анализ'
    WHEN analysis_type = 'content_themes' THEN 'Темы для контента'
    WHEN analysis_type = 'user_personas' THEN 'User Personas'
    WHEN analysis_type = 'niche_integration' THEN 'Уровни интеграции с нишей'
    WHEN analysis_type = 'final_report' THEN 'Финальный отчет'
    ELSE analysis_type
  END;
$$;