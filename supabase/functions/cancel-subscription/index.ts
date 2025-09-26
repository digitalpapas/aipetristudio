import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ДИАГНОСТИЧЕСКАЯ функция создания подписи с подробным логированием
async function createSignature(data: Record<string, any>, secretKey: string): Promise<string> {
  // 1. Копируем данные и удаляем signature
  const cleanData = { ...data };
  delete cleanData.signature;
  
  // 2. Сортируем по ключам
  const sortedKeys = Object.keys(cleanData).sort();
  
  // 3. Строим query string БЕЗ URL-кодирования (как в PHP)
  const queryString = sortedKeys
    .map(key => `${key}=${cleanData[key]}`)
    .join('&');
  
  // МАКСИМАЛЬНАЯ ДИАГНОСТИКА
  console.log('🔍 SIGNATURE DEBUG:');
  console.log('  📝 Original data:', data);
  console.log('  🧹 Clean data:', cleanData);
  console.log('  📋 Sorted keys:', sortedKeys);
  console.log('  🔗 Query string:', queryString);
  console.log('  🔑 Secret key:', `***${secretKey.slice(-4)} (length: ${secretKey.length})`);
  console.log('  📏 Query length:', queryString.length);
  
  // Создаем подпись
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
  
  console.log('  ✍️ Generated signature:', hashHex);
  console.log('🔍 END SIGNATURE DEBUG\n');
  
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

    // Пробуем ВСЕ возможные комбинации параметров
    const attempts = [
      // Вариант 1: как в документации (числа)
      {
        subscription: subscriptionId,
        customer_email: userEmail,
        active_user: 0
      },
      // Вариант 2: все как строки  
      {
        subscription: subscriptionId,
        customer_email: userEmail,
        active_user: "0"
      },
      // Вариант 3: active_manager вместо active_user
      {
        subscription: subscriptionId,
        customer_email: userEmail,
        active_manager: 0
      },
      // Вариант 4: только subscription и email
      {
        subscription: subscriptionId,
        customer_email: userEmail
      },
      // Вариант 5: возможно нужен customer_phone
      {
        subscription: subscriptionId,
        customer_phone: userEmail, // попробуем email как phone
        active_user: 0
      },
      // Вариант 6: может быть нужен другой идентификатор
      {
        subscription: subscriptionId,
        customer_email: userEmail,
        active_user: "false"
      }
    ];

    let success = false;
    let lastError = '';
    const PRODAMUS_URL = 'https://neurosetipraktika.payform.ru/rest/setActivity/';
    
    for (let i = 0; i < attempts.length; i++) {
      const prodamusData = attempts[i];
      
      console.log(`\n🚀 ===== ATTEMPT ${i + 1} =====`);
      console.log('📤 Data to send:', prodamusData);
      
      // Создаем подпись
      const signature = await createSignature(prodamusData, PRODAMUS_SECRET_KEY);
      
      // Финальные данные для отправки
      const requestData = {
        ...prodamusData,
        signature
      };

      console.log('📦 Final request data:', requestData);
      console.log('🌐 Sending to URL:', PRODAMUS_URL);
      
      try {
        const response = await fetch(PRODAMUS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(requestData as any).toString()
        });

        const responseText = await response.text();
        console.log(`📥 Response ${i + 1}:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Headers: ${JSON.stringify([...response.headers.entries()])}`);
        console.log(`   Body: "${responseText}"`);
        console.log(`   Body length: ${responseText.length}`);
        console.log(`   Trimmed body: "${responseText.trim()}"`);

        // Проверяем успех (может быть разные варианты ответа)
        const normalizedResponse = responseText.trim().toLowerCase();
        if (response.ok && (
          normalizedResponse === 'success' ||
          normalizedResponse === 'ok' ||
          normalizedResponse === '1' ||
          normalizedResponse === 'true' ||
          responseText.includes('success')
        )) {
          console.log('✅ SUCCESS! Cancellation worked with attempt', i + 1);
          
          // Update database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              prodamus_subscription_id: null
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('❌ DB update error:', updateError);
          } else {
            console.log('✅ Database updated successfully');
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Автопродление отменено успешно',
              method: `Attempt ${i + 1}` 
            }),
            { 
              status: 200, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        } else {
          lastError = `Attempt ${i + 1}: HTTP ${response.status}, Body: "${responseText.trim()}"`;
          console.log(`❌ ${lastError}`);
        }
      } catch (fetchError: any) {
        lastError = `Attempt ${i + 1}: Network error - ${fetchError.message}`;
        console.error(`❌ ${lastError}`);
      }
      
      console.log(`===== END ATTEMPT ${i + 1} =====\n`);
    }
    
    // Если все попытки провалились
    return new Response(
      JSON.stringify({ 
        error: 'Failed to cancel subscription after all attempts', 
        details: lastError,
        totalAttempts: attempts.length
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