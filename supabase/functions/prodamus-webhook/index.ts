import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProdamusWebhookData {
  payment_status: string;
  customer_email: string;
  order_id: string;
  products: Array<{
    name: string;
    price: number;
  }>;
  order_sum: number;
  payment_date: string;
  subscription_id?: string;
  payment_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Received Prodamus webhook');
    
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const webhookData: ProdamusWebhookData = await req.json();
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

    // Check if payment is successful
    if (webhookData.payment_status !== 'success') {
      console.log('Payment not successful, status:', webhookData.payment_status);
      return new Response('Payment not successful', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    const { customer_email, order_id, order_sum, products, subscription_id, payment_type } = webhookData;

    // Find user by email in auth.users table
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching users:', authError);
      throw new Error('Failed to fetch users');
    }

    const user = authUsers.users.find(u => u.email === customer_email);
    
    if (!user) {
      console.error('User not found with email:', customer_email);
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    console.log('Found user:', user.id, user.email);

    // Determine payment type: if subscription_id is provided and equals '2510594', it's a subscription
    const isSubscriptionPayment = subscription_id === '2510594';
    const isRecurring = payment_type === 'recurring' || (isSubscriptionPayment && payment_type !== 'initial');
    
    console.log('Payment type:', { isSubscriptionPayment, isRecurring, subscription_id, payment_type });

    // Calculate subscription expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Prepare profile update data
    const profileUpdateData: any = {
      subscription_status: 'pro',
      subscription_expires_at: expirationDate.toISOString(),
    };

    // If this is the first subscription payment, save the subscription ID
    if (isSubscriptionPayment && !isRecurring) {
      profileUpdateData.prodamus_subscription_id = subscription_id;
    }

    // Update user's subscription status and expiration
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdateData)
      .eq('user_id', user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      throw new Error('Failed to update user profile');
    }

    console.log('Updated user profile subscription');

    // Determine plan from products
    const planName = products.length > 0 ? products[0].name : 'Pro Plan';

    // Save payment information with new fields
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        email: customer_email,
        amount: order_sum,
        plan: planName,
        prodamus_order_id: order_id,
        prodamus_subscription_id: isSubscriptionPayment ? subscription_id : null,
        payment_type: isRecurring ? 'recurring' : 'initial',
        status: 'completed',
      });

    if (paymentError) {
      console.error('Error saving payment:', paymentError);
      throw new Error('Failed to save payment information');
    }

    console.log('Saved payment information');

    // Create notification for user
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Подписка активирована!',
        message: `Ваша подписка Pro успешно активирована до ${expirationDate.toLocaleDateString('ru-RU')}`,
        type: 'subscription',
        action_url: '/dashboard/profile'
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't throw error for notification failure
    }

    console.log('Webhook processing completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Subscription updated successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Prodamus webhook:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});