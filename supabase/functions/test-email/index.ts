import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName } = await req.json();
    
    console.log("Sending test email to:", userEmail);
    
    const confirmationUrl = `${req.headers.get('origin') || 'https://preview--deep-scope-ai.lovable.app'}/verify-email`;
    
    // Создаем Supabase клиент для edge function
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Вызываем нашу функцию отправки email
    const emailResponse = await supabase.functions.invoke('send-verification-email', {
      body: {
        userEmail,
        userName,
        confirmationUrl
      }
    });

    console.log("Email function response:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Test email sent to ${userEmail}`,
      response: emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in test-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);