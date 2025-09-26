import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC signature creation ТОЧНО по алгоритму Prodamus (как в официальном PHP классе)
async function createSignature(data: Record<string, any>, secretKey: string): Promise<string> {
  // 1. Копируем данные и удаляем signature (точно как в PHP: unset($data['signature']))
  const cleanData = { ...data };
  delete cleanData.signature;
  
  // 2. Сортируем по ключам (точно как в PHP: ksort($data))
  const sortedKeys = Object.keys(cleanData).sort();
  
  // 3. Строим query string БЕЗ URL-кодирования (точно как http_build_query в PHP)
  // ВАЖНО: Prodamus НЕ использует encodeURIComponent для подписи!
  const queryString = sortedKeys
    .map(key => `${key}=${cleanData[key]}`)
    .join('&');
  
  console.log('🔐 Signature data (cleaned):', cleanData);
  console.log('🔐 Query string for HMAC:', queryString);
  console.log('🔐 Secret key length:', secretKey.length);
  
  // 4. Создаем HMAC SHA256 (точно как hash_hmac('sha256', $str, $key) в PHP)
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
  
  console.log('🔐 Generated signature:', hashHex);
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

    // Пробуем разные варианты параметров согласно документации Prodamus
    const attempts = [
      // Вариант 1: active_user как число (как в документации)
      {
        subscription: subscriptionId,
        customer_email: userEmail,
        active_user: 0 // число, не строка!
      },
      // Вариант 2: active_user как строка
      {
        subscription: subscriptionId,
        customer_email: userEmail,
        active_user: "0"
      },
      // Вариант 3: через active_manager (альтернативный способ)
      {
        subscription: subscriptionId,
        customer_email: userEmail,
        active_manager: 0
      }
    ];

    let success = false;
    let lastError = '';
    
    // Используем ТОЛЬКО правильный домен (из логов видно что он работает)
    const PRODAMUS_URL = 'https://neurosetipraktika.payform.ru/rest/setActivity/';
    
    for (let i = 0; i < attempts.length; i++) {
      const prodamusData = attempts[i];
      
      console.log(`🚀 Attempt ${i + 1}:`, prodamusData);
      
      // Создаем подпись
      const signature = await createSignature(prodamusData, PRODAMUS_SECRET_KEY);
      
      // Финальные данные для отправки
      const requestData = {
        ...prodamusData,
        signature
      };

      console.log('📤 Sending to Prodamus:', requestData);

      
      try {
        const response = await fetch(PRODAMUS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(requestData as any).toString()
        });

        const responseText = await response.text();
        console.log(`📥 Response ${i + 1}:`, response.status, responseText.substring(0, 100));

        if (response.ok && responseText.trim().toLowerCase() === 'success') {
          console.log('✅ SUCCESS! Cancellation worked');
          
          // Update user's subscription status in our database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              prodamus_subscription_id: null // Отключаем автопродление
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('❌ DB update error:', updateError);
          } else {
            console.log('✅ DB updated successfully');
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
        } else {
          lastError = `HTTP ${response.status}: ${responseText.substring(0, 200)}`;
          console.log(`❌ Attempt ${i + 1} failed:`, lastError);
        }
      } catch (fetchError: any) {
        lastError = `Network error: ${fetchError.message}`;
        console.error(`❌ Network error attempt ${i + 1}:`, fetchError);
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