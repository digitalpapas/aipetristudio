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

// Мапинг ассистентов (тот же, что в analyze-segment)
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
} as const;

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

// Названия анализов для уведомлений
const ANALYSIS_NAMES: { [key: string]: string } = {
  segment_description: 'Описание сегмента',
  bdf_analysis: 'BDF анализ',
  problems_analysis: 'Боли, страхи, потребности',
  solutions_analysis: 'Работа с болями и возражениями',
  jtbd_analysis: 'JTBD анализ',
  user_personas: 'User Personas',
  content_themes: 'Темы для контента',
  niche_integration: 'Интеграция с нишей',
  final_report: 'Аналитический отчет'
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key не настроен');
    }

    const body = await req.json();
    const { researchId, segmentId, segmentName, analysisType, userComments, dependencies } = body ?? {};

    if (!researchId || !segmentId || !analysisType) {
      return new Response(JSON.stringify({ error: 'Некорректные параметры запроса' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const assistantId = ASSISTANT_IDS[analysisType as keyof typeof ASSISTANT_IDS];
    if (!assistantId) {
      return new Response(JSON.stringify({ error: `Неизвестный тип анализа: ${analysisType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Сброс старых данных и установка статуса processing
    await supabase
      .from('segment_analyses')
      .delete()
      .eq('Project ID', researchId)
      .eq('Сегмент ID', segmentId)
      .eq('analysis_type', analysisType);

    await supabase.from('segment_analyses').insert({
      'Project ID': researchId,
      'Сегмент ID': segmentId,
      'Название сегмента': segmentName,
      analysis_type: analysisType,
      status: 'processing'
    });

    // 2) Вернуть ответ СРАЗУ, а всю тяжёлую работу — в фоне
    const authHeader = req.headers.get('authorization') || '';

    // Run background task without blocking response
    (async () => {
      try {
        console.log(`Перегенерация ${analysisType} запущена (project=${researchId}, segment=${segmentId})`);

        // 2.1 Создаём thread
        const threadResp = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        if (!threadResp.ok) {
          console.error('Thread creation error:', await threadResp.text());
          throw new Error('Не удалось создать thread');
        }
        const thread = await threadResp.json();

        // 2.2 Формируем сообщение
        let message = `Название сегмента: ${segmentName}\n\n`;
        if (dependencies && Object.keys(dependencies).length > 0) {
          for (const [key, value] of Object.entries(dependencies)) {
            const displayName = ANALYSIS_NAMES[key] || key;
            message += `${displayName}:\n${value}\n\n`;
          }
        }
        message += `КОММЕНТАРИИ ПОЛЬЗОВАТЕЛЯ ДЛЯ УЧЕТА:\n${userComments || ''}\n\n`;
        const baseInstruction = ANALYSIS_INSTRUCTIONS[analysisType] || 'Проведи анализ сегмента.';
        message += `${baseInstruction}\n\nОБЯЗательно учти комментарии пользователя и адаптируй анализ согласно его пожеланиям.`;

        // 2.3 Добавляем сообщение
        const msgResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({ role: 'user', content: message })
        });
        if (!msgResp.ok) {
          console.error('Message creation error:', await msgResp.text());
          throw new Error('Не удалось добавить сообщение');
        }

        // 2.4 Запуск assistant
        const runResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({ assistant_id: assistantId })
        });
        if (!runResp.ok) {
          console.error('Run creation error:', await runResp.text());
          throw new Error('Не удалось запустить assistant');
        }
        const run = await runResp.json();

        // 2.5 Ожидаем завершения (в фоне)
        let status = run.status as string;
        let attempts = 0;
        const maxAttempts = 180; // ~3 минуты
        while (!['completed','failed','cancelled','expired'].includes(status) && attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const st = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
              headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'OpenAI-Beta': 'assistants=v2' },
              signal: AbortSignal.timeout(10000)
            });
            if (!st.ok) {
              attempts++;
              continue;
            }
            const stData = await st.json();
            status = stData.status;
            attempts++;
          } catch (e) {
            attempts++;
          }
        }
        if (status !== 'completed') throw new Error(`Run finished with status ${status}`);

        // 2.6 Получаем сообщения и вытаскиваем ответ
        const msgs = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'OpenAI-Beta': 'assistants=v2' }
        });
        if (!msgs.ok) {
          console.error('Messages fetch error:', await msgs.text());
          throw new Error('Не удалось получить сообщения');
        }
        const messages = await msgs.json();
        const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
        if (!assistantMessage) throw new Error('Не получен ответ от assistant');

        const content = assistantMessage.content?.[0];
        let resultText = '';
        if (content?.type === 'text') {
          try {
            const parsed = JSON.parse(content.text.value);
            resultText = parsed.text || content.text.value;
          } catch {
            resultText = content.text.value;
          }
        }

        // 2.7 Обновляем запись в БД
        const { error: saveError } = await supabase.from('segment_analyses')
          .update({
            status: 'completed',
            content: { text: resultText, analysis_result: resultText, timestamp: new Date().toISOString() },
            updated_at: new Date().toISOString()
          })
          .eq('Project ID', researchId)
          .eq('Сегмент ID', segmentId)
          .eq('analysis_type', analysisType)
          .eq('status', 'processing');
        if (saveError) throw saveError;

        // 2.8 Создаём уведомление пользователю
        try {
          if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (user?.id) {
              await supabase.from('notifications').insert({
                user_id: user.id,
                title: 'Перегенерация завершена',
                message: `${ANALYSIS_NAMES[analysisType] || analysisType} для сегмента "${segmentName}" обновлен с учетом ваших комментариев`,
                type: 'research',
                action_url: `/dashboard/research/${researchId}/segment/${segmentId}`,
                research_id: researchId,
                segment_id: segmentId
              });
            }
          }
        } catch (e) {
          console.warn('Failed to create notification:', e);
        }

        console.log(`Перегенерация ${analysisType} успешно завершена`);
      } catch (err) {
        console.error('Background task error (regenerate):', err);
        // Очистка processing записи в случае ошибки
        try {
          await supabase
            .from('segment_analyses')
            .delete()
            .eq('Project ID', researchId)
            .eq('Сегмент ID', segmentId)
            .eq('analysis_type', analysisType)
            .eq('status', 'processing');
        } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
        }
      }
    })().catch(console.error);

    // Немедленный ответ
    return new Response(JSON.stringify({ queued: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Ошибка в Edge Function regenerate-segment-analysis:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
