import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC signature creation for Prodamus API
async function createSignature(data: Record<string, any>, secretKey: string): Promise<string> {
  // Создаем query string в правильном порядке для Prodamus API
  // Порядок важен! Параметры должны быть отсортированы по алфавиту  
  const sortedEntries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const queryString = sortedEntries
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  console.log('Query string for signature:', queryString);
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(queryString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Cancel Subscription Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  try {
    const { subscriptionId, userEmail } = await req.json();
    
    if (!subscriptionId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing subscriptionId or userEmail' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Cancelling subscription:', subscriptionId, 'for user:', userEmail);

    // Get Prodamus secret key
    const PRODAMUS_SECRET_KEY = Deno.env.get('PRODAMUS_SECRET_KEY');
    if (!PRODAMUS_SECRET_KEY) {
      throw new Error('PRODAMUS_SECRET_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Verify user owns this subscription
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('prodamus_subscription_id, subscription_status, subscription_expires_at')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.prodamus_subscription_id !== subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found or unauthorized' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Prepare data for Prodamus API according to official documentation
    const prodamusData = {
      subscription: subscriptionId,
      customer_email: userEmail,
      active_user: 0 // 0 = deactivated by user (cannot be reactivated)
    };

    console.log('Prodamus data for signature:', prodamusData);
    
    // Create signature for security
    const signature = await createSignature(prodamusData, PRODAMUS_SECRET_KEY);
    
    console.log('Generated signature:', signature);
    
    // Convert to string format for form submission (all values must be strings for URLSearchParams)
    const requestData = {
      subscription: subscriptionId,
      customer_email: userEmail,
      active_user: '0',
      signature
    };

    console.log('Sending request to Prodamus API:', requestData);

    // Try different possible endpoints based on documentation
    const possibleUrls = [
      'https://neurosetipraktika.payform.ru/rest/setActivity/', // Your specific domain
      'https://payform.ru/rest/setActivity/',                   // Production environment
      'https://demo.payform.ru/rest/setActivity/',              // Demo environment if needed
    ];
    
    let lastError = null;
    let success = false;
    
    for (const prodamusUrl of possibleUrls) {
      console.log(`Trying URL: ${prodamusUrl}`);
      
      try {
        const response = await fetch(prodamusUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(requestData).toString()
        });

        const responseText = await response.text();
        console.log('Prodamus API response:', response.status, responseText);

        if (response.ok && responseText === 'success') {
          // Update user's subscription status in our database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              // Оставляем статус как есть - месяц уже оплачен
              // Только убираем автопродление
              prodamus_subscription_id: null // Убираем связь с подпиской для отключения автопродления
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating profile:', updateError);
            // Don't fail the request if DB update fails, as Prodamus cancellation worked
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Автопродление отменено успешно' 
            }),
            { 
              status: 200, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        } else if (response.ok) {
          // If response is OK but not 'success', try next URL
          lastError = `Unexpected response: ${responseText}`;
          continue;
        } else {
          // If response is not OK, try next URL
          lastError = `HTTP ${response.status}: ${responseText}`;
          continue;
        }
      } catch (fetchError: any) {
        console.error(`Error with URL ${prodamusUrl}:`, fetchError);
        lastError = fetchError.message;
        continue;
      }
    }
    
    // If we get here, all URLs failed
    return new Response(
      JSON.stringify({ 
        error: 'Failed to cancel subscription', 
        details: lastError || 'All endpoints failed'
      }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in cancel-subscription function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);