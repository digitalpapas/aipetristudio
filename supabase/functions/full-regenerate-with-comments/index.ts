import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔄 Received full-regenerate-with-comments request');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { research_id, user_id, user_comment, current_segments, original_research } = await req.json();

    console.log('📝 Request data:', {
      research_id,
      user_id,
      comment_length: user_comment?.length || 0,
      segments_count: current_segments?.length || 0,
      original_research: original_research?.project_name
    });

    if (!research_id || !user_id || !user_comment || !current_segments) {
      throw new Error('Missing required parameters');
    }

    // Обновляем статус исследования
    await supabase
      .from('researches')
      .update({ status: 'processing' })
      .eq('Project ID', research_id);

    console.log('✅ Updated research status to processing');

    // Удаляем существующие сегменты
    await supabase
      .from('segments')
      .delete()
      .eq('Project ID', research_id);

    await supabase
      .from('top_segments')
      .delete()
      .eq('project_id', research_id);

    console.log('🗑️ Deleted existing segments and top segments');

    // Формируем данные текущих сегментов для первого агента
    const segmentsForAnalysis = current_segments.map((segment: any, index: number) => ({
      id: index + 1,
      title: segment["Название сегмента"] || segment.title || `Сегмент ${index + 1}`,
      description: segment.description || segment["Описание"] || "",
      problems: segment.problems || segment["Проблемы"] || "",
      message: segment.message || segment["Ключевые сообщения"] || ""
    }));

    console.log('📊 Prepared segments for analysis:', segmentsForAnalysis.length);

    // ПЕРВЫЙ АГЕНТ: Анализ и корректировка на основе комментария
    const firstAgentPrompt = `
Ты - эксперт по анализу сегментов аудитории. Твоя задача - проанализировать существующие сегменты и комментарий пользователя, затем создать улучшенные сегменты.

ТЕКУЩИЕ СЕГМЕНТЫ:
${JSON.stringify(segmentsForAnalysis, null, 2)}

КОММЕНТАРИЙ ПОЛЬЗОВАТЕЛЯ:
"${user_comment}"

ИСХОДНЫЙ ПРОЕКТ:
- Название: ${original_research.project_name}
- Описание: ${original_research.description}

ЗАДАЧА:
1. Проанализируй комментарий пользователя и пойми, что его не устраивает в текущих сегментах
2. Создай 20 новых улучшенных сегментов, учитывая замечания пользователя
3. Каждый сегмент должен иметь: название, описание, проблемы, ключевые сообщения

ФОРМАТ ОТВЕТА (строго JSON):
{
  "segments": [
    {
      "id": 1,
      "title": "название сегмента",
      "description": "подробное описание сегмента",
      "problems": "основные проблемы и потребности сегмента",
      "message": "ключевые сообщения для этого сегмента"
    }
  ]
}

Создай ровно 20 сегментов. Отвечай только JSON без дополнительного текста.`;

    console.log('🤖 Calling first agent (GPT-5)...');

    const firstAgentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'user', content: firstAgentPrompt }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!firstAgentResponse.ok) {
      const errorData = await firstAgentResponse.text();
      console.error('❌ First agent API error:', errorData);
      throw new Error(`First agent API error: ${firstAgentResponse.status}`);
    }

    const firstAgentData = await firstAgentResponse.json();
    const firstAgentContent = firstAgentData.choices[0].message.content;
    
    console.log('✅ First agent response received');

    let improvedSegments;
    try {
      improvedSegments = JSON.parse(firstAgentContent);
    } catch (parseError) {
      console.error('❌ Error parsing first agent response:', parseError);
      throw new Error('Failed to parse first agent response');
    }

    if (!improvedSegments.segments || !Array.isArray(improvedSegments.segments)) {
      throw new Error('Invalid segments format from first agent');
    }

    console.log('📊 Generated improved segments:', improvedSegments.segments.length);

    // ВТОРОЙ АГЕНТ: Выбор ТОП-3 сегментов
    const secondAgentPrompt = `
Ты - эксперт по маркетинговому анализу. Твоя задача - выбрать ТОП-3 самых перспективных сегмента из предложенных.

СЕГМЕНТЫ ДЛЯ АНАЛИЗА:
${JSON.stringify(improvedSegments.segments, null, 2)}

ПРОЕКТ:
- Название: ${original_research.project_name}
- Описание: ${original_research.description}

КОММЕНТАРИЙ ПОЛЬЗОВАТЕЛЯ ДЛЯ УЧЕТА:
"${user_comment}"

КРИТЕРИИ ВЫБОРА:
1. Наибольший коммерческий потенциал
2. Доступность для воздействия
3. Соответствие комментарию пользователя
4. Размер сегмента
5. Готовность к покупке

ЗАДАЧА: Выбери ТОП-3 сегмента и для каждого напиши:
- Подробное обоснование выбора
- Полный анализ сегмента
- Рекомендации по работе

ФОРМАТ ОТВЕТА (строго JSON):
{
  "top_segments": [
    {
      "rank": 1,
      "segment_id": 5,
      "title": "название сегмента",
      "description": "описание сегмента",
      "reasoning": "подробное обоснование, почему этот сегмент в топе",
      "full_analysis": "детальный анализ сегмента, его потенциала и особенностей"
    }
  ]
}

Выбери ровно 3 сегмента, ранжированных по перспективности. Отвечай только JSON.`;

    console.log('🤖 Calling second agent (GPT-5)...');

    const secondAgentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'user', content: secondAgentPrompt }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!secondAgentResponse.ok) {
      const errorData = await secondAgentResponse.text();
      console.error('❌ Second agent API error:', errorData);
      throw new Error(`Second agent API error: ${secondAgentResponse.status}`);
    }

    const secondAgentData = await secondAgentResponse.json();
    const secondAgentContent = secondAgentData.choices[0].message.content;
    
    console.log('✅ Second agent response received');

    let topSegmentsAnalysis;
    try {
      topSegmentsAnalysis = JSON.parse(secondAgentContent);
    } catch (parseError) {
      console.error('❌ Error parsing second agent response:', parseError);
      throw new Error('Failed to parse second agent response');
    }

    if (!topSegmentsAnalysis.top_segments || !Array.isArray(topSegmentsAnalysis.top_segments)) {
      throw new Error('Invalid top segments format from second agent');
    }

    console.log('🏆 Generated top segments:', topSegmentsAnalysis.top_segments.length);

    // Сохраняем все сегменты в таблицу segments
    const segmentsToInsert = improvedSegments.segments.map((segment: any) => ({
      'Project ID': research_id,
      'Сегмент ID': segment.id,
      'Название сегмента': segment.title,
      description: segment.description,
      problems: segment.problems,
      message: segment.message,
      is_selected: false
    }));

    const { error: segmentsError } = await supabase
      .from('segments')
      .insert(segmentsToInsert);

    if (segmentsError) {
      console.error('❌ Error inserting segments:', segmentsError);
      throw new Error('Failed to insert segments');
    }

    console.log('✅ Inserted all segments to database');

    // Сохраняем топ-3 сегмента в таблицу top_segments
    const topSegmentsToInsert = topSegmentsAnalysis.top_segments.map((topSegment: any) => ({
      project_id: research_id,
      segment_id: topSegment.segment_id,
      rank: topSegment.rank,
      title: topSegment.title,
      description: topSegment.description,
      reasoning: topSegment.reasoning,
      full_analysis: topSegment.full_analysis
    }));

    const { error: topSegmentsError } = await supabase
      .from('top_segments')
      .insert(topSegmentsToInsert);

    if (topSegmentsError) {
      console.error('❌ Error inserting top segments:', topSegmentsError);
      throw new Error('Failed to insert top segments');
    }

    console.log('✅ Inserted top segments to database');

    // Обновляем статус исследования на завершенное
    await supabase
      .from('researches')
      .update({ 
        status: 'completed',
        generated_segments: improvedSegments.segments
      })
      .eq('Project ID', research_id);

    console.log('✅ Updated research status to completed');

    // Создаем уведомление об успешной перегенерации
    await supabase
      .from('notifications')
      .insert({
        user_id: user_id,
        title: 'Перегенерация завершена',
        message: 'Новые сегменты созданы с учётом ваших комментариев',
        type: 'success',
        research_id: research_id
      });

    console.log('✅ Created success notification');

    return new Response(JSON.stringify({
      success: true,
      message: 'Regeneration completed successfully',
      segments_count: improvedSegments.segments.length,
      top_segments_count: topSegmentsAnalysis.top_segments.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in full-regenerate-with-comments function:', error);
    
    // Пытаемся вернуть статус исследования обратно при ошибке
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { research_id, user_id } = await req.json();
      
      if (research_id) {
        await supabase
          .from('researches')
          .update({ status: 'completed' })
          .eq('Project ID', research_id);

        // Создаем уведомление об ошибке
        if (user_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: user_id,
              title: 'Ошибка перегенерации',
              message: 'Произошла ошибка при создании новых сегментов',
              type: 'error'
            });
        }
      }
    } catch (rollbackError) {
      console.error('❌ Error during rollback:', rollbackError);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});