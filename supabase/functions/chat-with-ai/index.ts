import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPEN_AI_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { systemPrompt, userMessage, context } = await req.json();

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not found');
      return new Response(JSON.stringify({ 
        error: 'AI service temporarily unavailable',
        response: 'AI-ассистент временно недоступен. Попробуйте позже.'
      }), {
        status: 200, // Return 200 so the UI can handle gracefully
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Sending request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_completion_tokens: 300,
        // Note: temperature parameter not supported for GPT-4.1+ models
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        response: 'Извините, возникла техническая проблема с AI-сервисом. Попробуйте переформулировать вопрос или обратитесь позже.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');
    
    const aiResponse = data.choices?.[0]?.message?.content || 'Не удалось получить ответ от AI.';

    return new Response(JSON.stringify({ 
      response: aiResponse,
      context: context 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    
    return new Response(JSON.stringify({ 
      response: 'Возникла техническая ошибка. AI-ассистент временно недоступен, но вы можете продолжить работу с анализом.'
    }), {
      status: 200, // Return 200 for graceful error handling
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});