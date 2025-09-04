-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Allow system to create notifications (for triggers and functions)
CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Create function to auto-delete old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.notifications 
  WHERE created_at < now() - interval '30 days';
$$;

-- Create trigger function for research status changes
CREATE OR REPLACE FUNCTION public.create_research_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification when research status changes to 'completed'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW."User ID",
      'Исследование завершено',
      'Ваше исследование "' || NEW."Project name" || '" готово к просмотру',
      'research',
      '/dashboard/research/' || NEW."Project ID"
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for research status changes
CREATE TRIGGER research_status_notification
  AFTER UPDATE ON public.researches
  FOR EACH ROW
  EXECUTE FUNCTION public.create_research_notification();