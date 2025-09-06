-- First, drop existing RLS policies to start fresh
DROP POLICY IF EXISTS "Allow enterprise admins to manage inquiries" ON public.enterprise_inquiries;
DROP POLICY IF EXISTS "Allow inquiry submissions from authenticated users" ON public.enterprise_inquiries;
DROP POLICY IF EXISTS "Deny enterprise inquiries access to non-admins" ON public.enterprise_inquiries;

-- Create secure RLS policies for enterprise_inquiries table

-- 1. Only enterprise admins can view/read inquiry data
CREATE POLICY "Enterprise admins can view all inquiries" 
ON public.enterprise_inquiries 
FOR SELECT 
TO authenticated
USING (public.is_enterprise_admin());

-- 2. Only enterprise admins can update inquiry status/data
CREATE POLICY "Enterprise admins can update inquiries" 
ON public.enterprise_inquiries 
FOR UPDATE 
TO authenticated
USING (public.is_enterprise_admin())
WITH CHECK (public.is_enterprise_admin());

-- 3. Only enterprise admins can delete inquiries
CREATE POLICY "Enterprise admins can delete inquiries" 
ON public.enterprise_inquiries 
FOR DELETE 
TO authenticated
USING (public.is_enterprise_admin());

-- 4. Authenticated users can submit new inquiries (contact form)
-- But they cannot be enterprise admins (to prevent privilege escalation)
CREATE POLICY "Authenticated users can submit inquiries" 
ON public.enterprise_inquiries 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT public.is_enterprise_admin()
);

-- Add additional security: ensure email and name fields are not empty
-- This prevents malicious empty submissions
ALTER TABLE public.enterprise_inquiries 
ADD CONSTRAINT check_name_not_empty CHECK (length(trim(name)) > 0);

ALTER TABLE public.enterprise_inquiries 
ADD CONSTRAINT check_email_not_empty CHECK (length(trim(email)) > 0);

ALTER TABLE public.enterprise_inquiries 
ADD CONSTRAINT check_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create audit function to log access to sensitive data
CREATE OR REPLACE FUNCTION public.audit_enterprise_inquiry_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when inquiries are accessed (for security monitoring)
  INSERT INTO public.audit_log (
    table_name, 
    operation, 
    user_id, 
    record_id,
    timestamp
  ) VALUES (
    'enterprise_inquiries',
    TG_OP,
    auth.uid()::text,
    COALESCE(NEW.id::text, OLD.id::text),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id text,
  record_id text,
  timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only enterprise admins can view audit logs
CREATE POLICY "Enterprise admins can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.is_enterprise_admin());

-- Create trigger for auditing
DROP TRIGGER IF EXISTS audit_enterprise_inquiries ON public.enterprise_inquiries;
CREATE TRIGGER audit_enterprise_inquiries
  AFTER SELECT, INSERT, UPDATE, DELETE ON public.enterprise_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_inquiry_access();