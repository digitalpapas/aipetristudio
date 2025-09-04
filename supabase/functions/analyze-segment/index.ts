import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPEN_AI_API');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Мапинг ассистентов
const ASSISTANT_IDS = {
  segment_description: 'asst_10Cv0Z4b1it6hQKgcEp79BA3',
  bdf_analysis: 'asst_IPRanKKvpe0C0EahGCn6C8jC',
  problems_analysis: 'asst_w6Ft5oUXeIDy49KTlOM7Dcq8',
  solutions_analysis: 'asst_tQdZietpLTfIqFG2xnlwP88s',
  jtbd_analysis: 'asst_p6FH4Gk4LtQsXgZbRKBbAGmk',
  content_themes: 'asst_8ZyxI8n4LOsSRLQJc6G2TvcY',
  user_personas: 'asst_mVyf19GJRFaTnzWUFwXbtz57',
  niche_integration: 'asst_4lYMffKE4EnhuYbo0uTUlA5H',
  final_report: 'asst_e9GpCvsBPC4xfrIdqMYX9CER'
};

// Инструкции для каждого типа анализа
const ANALYSIS_INSTRUCTIONS = {
  segment_description: 'Создай детальное описание этого сегмента по установленному формату.',
  bdf_analysis: 'Проведи BDF анализ для этого сегмента.',
  problems_analysis: 'Проанализируй боли, страхи, потребности и возражения этого сегмента.',
  solutions_analysis: 'Разработай стратегии работы с болями, страхами, потребностями и возражениями.',
  jtbd_analysis: 'Проведи JTBD анализ для этого сегмента.',
  user_personas: 'Создай 5 детальных User Personas для этого сегмента.',
  content_themes: 'На основе всех предоставленных анализов разработай темы для контента.',
  niche_integration: 'На основе всех анализов определи уровни интеграции с нишей.',
  final_report: 'Создай комплексный аналитический отчет на основе всех проведенных анализов.'
};

// Названия анализов для форматирования зависимостей
const ANALYSIS_NAMES = {
  segment_description: 'Описание сегмента',
  bdf_analysis: 'BDF анализ',
  problems_analysis: 'Боли, страхи, потребности, возражения',
  solutions_analysis: 'Работа с болями и возражениями',
  jtbd_analysis: 'JTBD анализ',
  user_personas: 'User Personas',
  content_themes: 'Темы для контента',
  niche_integration: 'Уровни интеграции с нишей',
  final_report: 'Аналитический отчет'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key не настроен');
    }

    const { segmentName, segmentDescription, analysisType, dependencies } = await req.json();
    
    console.log(`Запуск анализа ${analysisType} для сегмента: ${segmentName}`);

    const assistantId = ASSISTANT_IDS[analysisType];
    if (!assistantId) {
      throw new Error(`Неизвестный тип анализа: ${analysisType}`);
    }

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

    // 2. Формируем сообщение
    let message = `Название сегмента: ${segmentName}\nОписание: ${segmentDescription}\n\n`;
    
    // Добавляем зависимости если есть
    if (dependencies && Object.keys(dependencies).length > 0) {
      Object.entries(dependencies).forEach(([key, value]) => {
        const displayName = ANALYSIS_NAMES[key] || key;
        message += `${displayName}:\n${value}\n\n`;
      });
    }
    
    // Добавляем инструкцию
    message += ANALYSIS_INSTRUCTIONS[analysisType] || 'Проведи анализ сегмента.';

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
        assistant_id: assistantId
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
    const maxAttempts = 120; // 2 минуты для сложных анализов

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
      
      // Логируем прогресс для длительных операций
      if (attempts % 10 === 0) {
        console.log(`Анализ ${analysisType}: ожидание ${attempts} сек...`);
      }
    }

    if (runStatus === 'failed') {
      throw new Error('Assistant не смог обработать запрос');
    }

    if (attempts >= maxAttempts) {
      throw new Error('Превышено время ожидания ответа');
    }

    console.log(`Анализ завершен за ${attempts} секунд`);

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

    console.log(`Анализ ${analysisType} успешно завершен`);

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
    console.error('Ошибка в Edge Function analyze-segment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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