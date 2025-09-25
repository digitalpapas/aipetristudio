import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPEN_AI_API');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Мапинг ассистентов
const ASSISTANT_IDS = {
  segment_description: 'asst_ATmAWgMJVxY36BICB8ZztqyA',
  bdf_analysis: 'asst_9yTcRpe2qhhuJBgNIJjwcuad',
  problems_analysis: 'asst_5xID8YZzduQViDwwjbLvDUDr',
  solutions_analysis: 'asst_2vYr6EfMDdAqhYElWi1lrhpb',
  jtbd_analysis: 'asst_5wDdJO9vn3SiJDVDGy2JiBdi',
  content_themes: 'asst_NnbBxrzI1Qf0f0pbgzpU9Oza',
  user_personas: 'asst_V0EoIILA29VE8rkNtUfAjWZr',
  niche_integration: 'asst_mx7nfoPMb8xOXbWlzFcc1BLC',
  final_report: 'asst_cL1PN5oSRaM4l5M1bHKaBHcO'
};

// Инструкции для каждого типа анализа
const ANALYSIS_INSTRUCTIONS: { [key: string]: string } = {
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
const ANALYSIS_NAMES: { [key: string]: string } = {
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

    const { researchId, segmentId, segmentName, segmentDescription, analysisType, dependencies } = await req.json();
    
    console.log(`Запуск анализа ${analysisType} для сегмента: ${segmentName} (project=${researchId}, segment=${segmentId})`);

    const assistantId = ASSISTANT_IDS[analysisType as keyof typeof ASSISTANT_IDS];
    if (!assistantId) {
      throw new Error(`Неизвестный тип анализа: ${analysisType}`);
    }

    // Init Supabase client with service role for DB writes
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Mark analysis as processing in DB (idempotent-ish)
    try {
      const { data: existing } = await supabase
        .from('segment_analyses')
        .select('id')
        .eq('Project ID', researchId)
        .eq('Сегмент ID', segmentId)
        .eq('analysis_type', analysisType)
        .eq('status', 'processing')
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await supabase.from('segment_analyses').insert({
          'Project ID': researchId,
          'Сегмент ID': segmentId,
          'Название сегмента': segmentName,
          analysis_type: analysisType,
          status: 'processing'
        });
      }
    } catch (e) {
      console.warn('Не удалось создать запись processing (будем продолжать):', e);
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
    const maxAttempts = 180; // 3 минуты для сложных анализов

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const statusResponse = await fetch(
          `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
          {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2'
            },
            signal: AbortSignal.timeout(10000) // 10 секунд таймаут для запроса статуса
          }
        );

        if (!statusResponse.ok) {
          const error = await statusResponse.text();
          console.error('Status check error:', error);
          // Попробуем еще раз вместо немедленного выброса ошибки
          attempts++;
          continue;
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        attempts++;
        
        // Логируем прогресс для длительных операций
        if (attempts % 10 === 0) {
          console.log(`Анализ ${analysisType}: ожидание ${attempts} сек...`);
        }
      } catch (error) {
        console.error(`Ошибка проверки статуса (попытка ${attempts}):`, error);
        attempts++;
        // Продолжаем попытки вместо немедленного завершения
        continue;
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

    // Save completed result to DB and cleanup processing rows
    try {
      const { error: saveError } = await supabase.from('segment_analyses').insert({
        'Project ID': researchId,
        'Сегмент ID': segmentId,
        'Название сегмента': segmentName,
        analysis_type: analysisType,
        status: 'completed',
        content: { text: resultText, analysis_result: resultText, timestamp: new Date().toISOString() }
      });
      if (saveError) console.error('DB save error:', saveError);

      const { error: cleanupError } = await supabase
        .from('segment_analyses')
        .delete()
        .eq('Project ID', researchId)
        .eq('Сегмент ID', segmentId)
        .eq('analysis_type', analysisType)
        .eq('status', 'processing');
      if (cleanupError) console.warn('Cleanup processing rows error:', cleanupError);
    } catch (dbErr) {
      console.error('DB operations failed:', dbErr);
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
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