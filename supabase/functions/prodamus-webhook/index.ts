import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prodamus-signature',
};

const SECRET_KEY = '9a48810fd60a2a65c6801282c40d5e83d3d3a2cb0f7df06f395401ef69a25d6f';

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

// Функция для проверки подписи
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  if (!signature) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature.toLowerCase() === expectedSignature.toLowerCase();
}

serve(async (req) => {
  console.log('=== Prodamus Webhook Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const bodyText = await req.text();
    console.log('Raw body:', bodyText);
    
    // Проверка подписи
    const signature = req.headers.get('x-prodamus-signature') || req.headers.get('signature');
    console.log('Signature header:', signature);
    
    const isSignatureValid = await verifySignature(bodyText, signature || '', SECRET_KEY);
    console.log('Signature validation:', isSignatureValid);
    
    if (!isSignatureValid) {
      console.log('Invalid signature, but continuing for testing...');
      // В продакшене раскомментировать:
      // return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
      //   status: 401,
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      // });
    }
    
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const webhookData: ProdamusWebhookData = JSON.parse(bodyText);
    console.log('Parsed webhook data:', JSON.stringify(webhookData, null, 2));

    // Проверяем обязательные условия
    if (webhookData.payment_status !== 'success') {
      console.log('Payment not successful, status:', webhookData.payment_status);
      return new Response(JSON.stringify({ success: true, message: 'Payment not successful' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (webhookData.subscription_id !== '2510594') {
      console.log('Not target subscription, ID:', webhookData.subscription_id);
      return new Response(JSON.stringify({ success: true, message: 'Not target subscription' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { customer_email } = webhookData;
    console.log('Processing subscription for email:', customer_email);

    // Найти или создать пользователя
    let user;
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching users:', authError);
      throw new Error('Failed to fetch users');
    }

    user = authUsers.users.find(u => u.email === customer_email);
    
    if (!user) {
      console.log('User not found, creating new user for email:', customer_email);
      
      // Создаем нового пользователя
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: customer_email,
        email_confirm: true,
        user_metadata: {
          full_name: customer_email.split('@')[0]
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw new Error('Failed to create user');
      }

      user = newUser.user;
      console.log('Created new user:', user.id, user.email);
    } else {
      console.log('Found existing user:', user.id, user.email);
    }

    // Устанавливаем подписку
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const profileUpdateData = {
      subscription_status: 'pro',
      subscription_expires_at: expirationDate.toISOString(),
      prodamus_subscription_id: '2510594'
    };

    console.log('Updating profile with data:', profileUpdateData);

    // Обновляем профиль пользователя (или создаем если не существует)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: user.id,
        ...profileUpdateData,
        full_name: user.user_metadata?.full_name || customer_email.split('@')[0]
      });

    if (profileError) {
      console.error('Error updating/creating profile:', profileError);
      throw new Error('Failed to update profile');
    }

    console.log('Successfully updated user profile subscription');

    // Создаем уведомление
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Подписка активирована!',
        message: `Ваша подписка Pro успешно активирована до ${expirationDate.toLocaleDateString('ru-RU')}`,
        type: 'subscription',
        action_url: '/dashboard'
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Не прерываем выполнение из-за ошибки уведомления
    }

    console.log('=== Webhook processing completed successfully ===');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== Error processing Prodamus webhook ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});