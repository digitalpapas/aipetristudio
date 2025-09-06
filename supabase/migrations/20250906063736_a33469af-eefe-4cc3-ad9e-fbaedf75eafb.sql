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

-- Add additional security constraints to prevent malicious submissions
ALTER TABLE public.enterprise_inquiries 
ADD CONSTRAINT IF NOT EXISTS check_name_not_empty CHECK (length(trim(name)) > 0);

ALTER TABLE public.enterprise_inquiries 
ADD CONSTRAINT IF NOT EXISTS check_email_not_empty CHECK (length(trim(email)) > 0);

ALTER TABLE public.enterprise_inquiries 
ADD CONSTRAINT IF NOT EXISTS check_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');