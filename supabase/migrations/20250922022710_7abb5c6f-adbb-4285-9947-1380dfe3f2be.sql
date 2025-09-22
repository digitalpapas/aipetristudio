-- Update profiles table with subscription fields
ALTER TABLE public.profiles 
ADD COLUMN subscription_status text DEFAULT 'demo',
ADD COLUMN subscription_expires_at timestamp with time zone,
ADD COLUMN trial_used boolean DEFAULT false,
ADD COLUMN researches_count integer DEFAULT 0,
ADD COLUMN segments_count integer DEFAULT 0;

-- Create payments table
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    amount decimal(10,2) NOT NULL,
    plan text NOT NULL,
    prodamus_order_id text UNIQUE NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments table
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payments" 
ON public.payments 
FOR ALL 
USING (auth.role() = 'service_role');

-- Additional RLS policy for profiles subscription updates
CREATE POLICY "Service role can update subscription status" 
ON public.profiles 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Create trigger for automatic timestamp updates on payments
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();