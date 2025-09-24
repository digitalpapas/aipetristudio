import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPEN_AI_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSISTANT_ID = 'asst_10Cv0Z4b1it6hQKgcEp79BA3';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key не настроен');
    }

    const { currentText, userComments, segmentName } = await req.json();
    
    console.log(`Запуск перегенерации с комментариями для сегмента: ${segmentName}`);

    // 1. Создаем thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!threadResponse.ok) {
      const error = await threadResponse.text();
      console.error('Thread creation error:', error);
      throw new Error('Не удалось создать thread');
    }

    const thread = await threadResponse.json();
    console.log(`Thread создан: ${thread.id}`);

    // 2. Формируем сообщение для адаптации
    const message = `
ЗАДАЧА: Адаптируй существующий анализ на основе комментариев пользователя.

СЕГМЕНТ: ${segmentName}

ТЕКУЩИЙ АНАЛИЗ:
${currentText}

КОММЕНТАРИИ ПОЛЬЗОВАТЕЛЯ:
${userComments}

ИНСТРУКЦИЯ: 
Проанализируй текущий анализ и комментарии пользователя. Адаптируй анализ с учетом всех замечаний и пожеланий пользователя. Сохрани структуру и качество исходного анализа, но внеси изменения согласно комментариям. Верни только адаптированный текст без дополнительных объяснений.`;

    // 3. Добавляем сообщение в thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.error('Message creation error:', error);
      throw new Error('Не удалось добавить сообщение');
    }

    console.log('Сообщение добавлено в thread');

    // 4. Запускаем assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Run creation error:', error);
      throw new Error('Не удалось запустить assistant');
    }

    const run = await runResponse.json();
    console.log(`Assistant запущен: ${run.id}`);

    // 5. Ждем завершения
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60; // 1 минута для адаптации

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      if (!statusResponse.ok) {
        const error = await statusResponse.text();
        console.error('Status check error:', error);
        throw new Error('Не удалось проверить статус');
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      
      // Логируем прогресс
      if (attempts % 10 === 0) {
        console.log(`Адаптация: ожидание ${attempts} сек...`);
      }
    }

    if (runStatus === 'failed') {
      throw new Error('Assistant не смог обработать запрос');
    }

    if (attempts >= maxAttempts) {
      throw new Error('Превышено время ожидания ответа');
    }

    console.log(`Адаптация завершена за ${attempts} секунд`);

    // 6. Получаем результат
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text();
      console.error('Messages fetch error:', error);
      throw new Error('Не удалось получить сообщения');
    }

    const messages = await messagesResponse.json();
    
    // Находим последнее сообщение от assistant
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('Не получен ответ от assistant');
    }

    // Извлекаем текст из ответа
    const content = assistantMessage.content[0];
    let resultText = '';

    if (content.type === 'text') {
      // Пробуем распарсить JSON из текста
      try {
        const parsed = JSON.parse(content.text.value);
        resultText = parsed.text || content.text.value;
      } catch {
        resultText = content.text.value;
      }
    }

    console.log('Адаптация успешно завершена');

    return new Response(
      JSON.stringify({ text: resultText }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Ошибка в Edge Function regenerate-with-comments:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});