-- Create a security definer function to check if user is admin
-- This prevents RLS recursion issues and provides secure admin checking
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT au.is_super_admin 
     FROM auth.users au 
     WHERE au.id = auth.uid()),
    false
  );
$$;

-- Drop the existing overly broad SELECT policy
DROP POLICY IF EXISTS "Admins can view all enterprise inquiries" ON public.enterprise_inquiries;

-- Create a more secure SELECT policy that only allows super admins
CREATE POLICY "Super admins can view enterprise inquiries" 
ON public.enterprise_inquiries 
FOR SELECT 
TO authenticated
USING (public.is_admin_user());

-- Also ensure the INSERT policy is secure - only allow authenticated users
DROP POLICY IF EXISTS "Users can submit enterprise inquiries" ON public.enterprise_inquiries;

CREATE POLICY "Authenticated users can submit enterprise inquiries" 
ON public.enterprise_inquiries 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);