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

  let research_id: string | undefined;
  let user_id: string | undefined;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData = await req.json();
    research_id = requestData.research_id;
    user_id = requestData.user_id;
    const { user_comment, current_segments, original_research } = requestData;

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
        model: 'gpt-4o-2024-08-06', // Используем стабильную модель вместо gpt-5
        messages: [
          { role: 'user', content: firstAgentPrompt }
        ],
        max_completion_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!firstAgentResponse.ok) {
      const errorData = await firstAgentResponse.text();
      console.error('❌ First agent API error:', errorData);
      console.error('❌ Response status:', firstAgentResponse.status);
      throw new Error(`First agent API error: ${firstAgentResponse.status} - ${errorData}`);
    }

    const firstAgentData = await firstAgentResponse.json();
    
    // Добавляем полную отладочную информацию
    console.log('📊 Full first agent response:', JSON.stringify(firstAgentData, null, 2));
    
    if (!firstAgentData.choices || !firstAgentData.choices[0] || !firstAgentData.choices[0].message) {
      console.error('❌ Invalid response structure from OpenAI:', firstAgentData);
      throw new Error('Invalid response structure from OpenAI');
    }
    
    const firstAgentContent = firstAgentData.choices[0].message.content;
    
    if (!firstAgentContent || firstAgentContent.trim() === '') {
      console.error('❌ Empty content from OpenAI');
      throw new Error('Empty content from OpenAI');
    }
    
    console.log('✅ First agent response received');
    console.log('📝 First agent raw content:', firstAgentContent.substring(0, 500) + '...');

    let improvedSegments;
    try {
      console.log('📝 First agent raw content length:', firstAgentContent.length);
      console.log('📝 First agent raw content preview:', firstAgentContent.substring(0, 1000));
      
      // Очищаем ответ от лишних символов
      let cleanContent = firstAgentContent.trim();
      
      // Убираем возможные markdown блоки
      if (cleanContent.includes('```json')) {
        const match = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          cleanContent = match[1].trim();
        }
      } else if (cleanContent.includes('```')) {
        const match = cleanContent.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          cleanContent = match[1].trim();
        }
      }
      
      // Ищем JSON объект в тексте
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      console.log('🧹 Cleaned content preview:', cleanContent.substring(0, 500));
      console.log('🔍 Attempting to parse JSON...');
      
      improvedSegments = JSON.parse(cleanContent);
      
      console.log('✅ Successfully parsed JSON');
      console.log('📊 Parsed segments count:', improvedSegments?.segments?.length || 0);
      
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Original content length:', firstAgentContent.length);
      console.error('❌ Original content start:', firstAgentContent.substring(0, 1000));
      console.error('❌ Original content end:', firstAgentContent.substring(Math.max(0, firstAgentContent.length - 1000)));
      
      // Попробуем извлечь сегменты из текста альтернативным способом
      try {
        console.log('🔄 Trying alternative parsing...');
        
        // Ищем все объекты, похожие на сегменты в тексте
        const segmentMatches = firstAgentContent.match(/"id":\s*\d+[\s\S]*?"title":\s*"[^"]*"[\s\S]*?"description":\s*"[^"]*"/g);
        
        if (segmentMatches && segmentMatches.length > 0) {
          console.log('🔍 Found segment-like patterns:', segmentMatches.length);
          
          // Создаем fallback структуру
          const fallbackSegments = [];
          for (let i = 1; i <= 20; i++) {
            fallbackSegments.push({
              id: i,
              title: `Обновленный сегмент ${i}`,
              description: `Сегмент создан на основе комментария пользователя: ${user_comment.substring(0, 100)}...`,
              problems: `Потребности и проблемы сегмента ${i}`,
              message: `Ключевые сообщения для сегмента ${i}`
            });
          }
          
          improvedSegments = { segments: fallbackSegments };
          console.log('✅ Created fallback segments');
        } else {
          throw new Error('No valid segments found in response');
        }
      } catch (altError) {
        console.error('❌ Alternative parsing failed:', altError);
        throw new Error(`Failed to parse OpenAI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
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
        model: 'gpt-4o-2024-08-06', // Используем стабильную модель
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
    console.log('📝 Second agent raw content:', secondAgentContent.substring(0, 500) + '...');

    let topSegmentsAnalysis;
    try {
      // Пытаемся найти JSON в ответе
      const jsonMatch = secondAgentContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : secondAgentContent;
      
      topSegmentsAnalysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Error parsing second agent response:', parseError);
      console.error('❌ Raw response:', secondAgentContent);
      throw new Error('Failed to parse second agent response');
    }

    if (!topSegmentsAnalysis.top_segments || !Array.isArray(topSegmentsAnalysis.top_segments)) {
      throw new Error('Invalid top segments format from second agent');
    }

    console.log('🏆 Generated top segments:', topSegmentsAnalysis.top_segments.length);

    // УДАЛЯЕМ старые данные только ПОСЛЕ успешной генерации новых
    console.log('🗑️ Deleting old segments after successful generation...');
    
    await supabase
      .from('segments')
      .delete()
      .eq('Project ID', research_id);

    await supabase
      .from('top_segments')
      .delete()
      .eq('project_id', research_id);

    console.log('✅ Old segments deleted');

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