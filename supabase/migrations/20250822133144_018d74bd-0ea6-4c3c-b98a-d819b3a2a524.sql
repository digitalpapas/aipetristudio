-- Fix critical security vulnerability in notifications table
-- Remove the overly permissive "System can create notifications" policy
-- and replace with secure policies

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a secure policy that only allows notification creation through proper channels:
-- 1. Service role (for edge functions)
-- 2. Security definer functions (bypassed by RLS automatically)
-- 3. Database triggers (bypassed by RLS automatically)

-- Policy for service role insertions (edge functions with service role key)
CREATE POLICY "Service role can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- Only allow if using service role or if it's the authenticated user creating for themselves
  (auth.role() = 'service_role') OR 
  (auth.uid()::text = user_id AND auth.role() = 'authenticated')
);

-- Add additional constraint to ensure user_id is always set correctly for user-created notifications
-- This prevents authenticated users from creating notifications for other users
CREATE POLICY "Users can only create notifications for themselves" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- If user is authenticated (not service role), they can only create notifications for themselves
  (auth.role() = 'authenticated' AND auth.uid()::text = user_id) OR
  (auth.role() = 'service_role')
);

-- Note: Database triggers and security definer functions automatically bypass RLS,
-- so the create_validated_notification() function and create_research_notification() trigger
-- will continue to work without modification.