-- Fix remaining security definer functions to use proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  DELETE FROM public.notifications 
  WHERE created_at < now() - interval '30 days';
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_analysis_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.analysis_jobs 
  SET status = 'failed',
      completed_at = now(),
      error_message = 'Timeout: Job exceeded maximum processing time'
  WHERE status = 'pending' 
    AND started_at < now() - interval '10 minutes';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analysis_display_name(analysis_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_research_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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