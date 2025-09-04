-- Clean up orphaned notifications before adding constraints
DELETE FROM public.notifications 
WHERE research_id IS NOT NULL 
  AND research_id NOT IN (SELECT "Project ID" FROM public.researches);

DELETE FROM public.notifications 
WHERE segment_id IS NOT NULL 
  AND (research_id, segment_id) NOT IN (
    SELECT "Project ID", "Сегмент ID" FROM public.segments
  );

-- Add foreign key constraint from notifications to researches
ALTER TABLE public.notifications 
ADD CONSTRAINT fk_notifications_research 
FOREIGN KEY (research_id) 
REFERENCES public.researches("Project ID") 
ON DELETE CASCADE;

-- Add foreign key constraint from notifications to segments
-- This requires both research_id and segment_id to match a valid segment
ALTER TABLE public.notifications 
ADD CONSTRAINT fk_notifications_segment 
FOREIGN KEY (research_id, segment_id) 
REFERENCES public.segments("Project ID", "Сегмент ID") 
ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_research_id 
ON public.notifications(research_id);

CREATE INDEX IF NOT EXISTS idx_notifications_research_segment 
ON public.notifications(research_id, segment_id);

-- Update the notification creation function to include validation
CREATE OR REPLACE FUNCTION public.create_validated_notification(
  p_user_id text,
  p_title text,
  p_message text DEFAULT NULL,
  p_type text DEFAULT 'system',
  p_action_url text DEFAULT NULL,
  p_research_id text DEFAULT NULL,
  p_segment_id numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  notification_id uuid;
BEGIN
  -- Validate research exists if research_id is provided
  IF p_research_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.researches WHERE "Project ID" = p_research_id) THEN
      RAISE EXCEPTION 'Research with ID % does not exist', p_research_id;
    END IF;
  END IF;
  
  -- Validate segment exists if both research_id and segment_id are provided
  IF p_research_id IS NOT NULL AND p_segment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.segments 
      WHERE "Project ID" = p_research_id AND "Сегмент ID" = p_segment_id
    ) THEN
      RAISE EXCEPTION 'Segment % does not exist in research %', p_segment_id, p_research_id;
    END IF;
  END IF;
  
  -- Create the notification
  INSERT INTO public.notifications (
    user_id, title, message, type, action_url, research_id, segment_id
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_action_url, p_research_id, p_segment_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Update the research completion trigger to use validated function
CREATE OR REPLACE FUNCTION public.create_research_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Create notification when research status changes to 'completed'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    PERFORM public.create_validated_notification(
      NEW."User ID",
      'Исследование завершено',
      'Ваше исследование "' || NEW."Project name" || '" готово к просмотру',
      'research',
      '/dashboard/research/' || NEW."Project ID",
      NEW."Project ID",
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$function$;