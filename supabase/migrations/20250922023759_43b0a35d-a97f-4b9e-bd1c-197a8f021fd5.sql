-- Add prodamus_subscription_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS prodamus_subscription_id text;

-- Add fields to payments table for Prodamus subscription handling
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS prodamus_subscription_id text,
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'initial';