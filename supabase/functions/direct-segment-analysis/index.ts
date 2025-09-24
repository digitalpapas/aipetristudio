import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  console.log('\n🚀 === DIRECT SEGMENT ANALYSIS STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  let projectId: string | undefined;
  const startTime = Date.now();

  try {
    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔧 Environment check:');
    console.log('- Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('- Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');
    console.log('- OpenAI Key:', openAIApiKey ? '✅ Set' : '❌ Missing');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key не настроен. Обратитесь к администратору.');
    }
    // Parse request body only once
    console.log('📝 Parsing request body...');
    const requestData = await req.json();
    const { projectName, description, userId } = requestData;
    projectId = requestData.projectId;
    
    console.log('📊 === ANALYSIS PARAMETERS ===');
    console.log('- Project:', projectName);
    console.log('- ProjectId:', projectId);
    console.log('- UserId:', userId);
    console.log('- Description length:', description?.length || 0);

    // Validate required fields
    if (!projectName || !description || !userId) {
      console.error('❌ Missing required fields');
      throw new Error('Отсутствуют обязательные поля: название проекта, описание или ID пользователя');
    }

    // If projectId is provided, verify ownership and update status
    if (projectId) {
      const { data: research, error: checkError } = await supabase
        .from('researches')
        .select('*')
        .eq('Project ID', projectId)
        .eq('User ID', userId)
        .single();

      if (checkError || !research) {
        console.error('Research check error:', checkError);
        throw new Error('Research not found or access denied');
      }

      // Update status to processing
      const { error: updateError } = await supabase
        .from('researches')
        .update({ 
          status: 'processing',
          error_message: null 
        })
        .eq('Project ID', projectId);
      
      if (updateError) {
        console.error('Failed to update research status:', updateError);
      }
    }

    // === STEP 1: First Agent - Generate 20 segments ===
    console.log('\n=== STEP 1: FIRST AGENT (20 SEGMENTS) ===');
    
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      const errorText = await threadResponse.text();
      console.error('Thread creation failed:', errorText);
      throw new Error(`Failed to create thread: ${threadResponse.status}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread created:', thread.id);

    // Add message for first agent  
    const messageContent = `Название проекта: ${projectName}

Описание идеи: ${description}

ВАЖНО: Для каждого сегмента обязательно включи поля "problems" и "message":
- "problems": Основные проблемы и потребности этого сегмента 
- "message": Ключевое маркетинговое сообщение для этого сегмента

Формат ответа должен быть JSON массивом из 20 объектов:
[
  {
    "id": 1,
    "title": "Название сегмента",
    "description": "Подробное описание сегмента",
    "problems": "Основные проблемы и потребности",
    "message": "Ключевое маркетинговое сообщение"
  }
]`;
    console.log('Sending to first agent, message length:', messageContent.length);
    
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent
      })
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error('Message creation failed:', errorText);
      throw new Error(`Failed to add message: ${messageResponse.status}`);
    }

    // Run first agent
    const assistantId1 = 'asst_q3YzNQ3SGQKbAP0sEtoI8D4F';
    console.log('Running first assistant:', assistantId1);
    
    const runResponse1 = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId1
      })
    });

    if (!runResponse1.ok) {
      const errorText = await runResponse1.text();
      console.error('Run creation failed:', errorText);
      throw new Error(`Failed to run first assistant: ${runResponse1.status}`);
    }

    const run1 = await runResponse1.json();
    console.log('First agent run started:', run1.id);

    // Wait for first agent completion - reduced timeout for Edge Function limits
    let run1Status = run1;
    let attempts = 0;
    const maxAttempts = 40; // 80 seconds max (40 * 2s)
    
    while (run1Status.status === 'queued' || run1Status.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        console.error('First agent timeout after', attempts * 2, 'seconds');
        throw new Error('Первый агент превысил лимит времени (80 сек). Попробуйте еще раз.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run1.id}`, {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error('Status check failed:', errorText);
          throw new Error(`Ошибка проверки статуса: ${statusResponse.status}`);
        }
        
        run1Status = await statusResponse.json();
        console.log(`🤖 Первый агент [${attempts + 1}/${maxAttempts}]: ${run1Status.status}`);
      } catch (fetchError) {
        console.error('Network error checking status:', fetchError);
        throw new Error('Ошибка сети при проверке статуса агента');
      }
      
      attempts++;
    }

    if (run1Status.status !== 'completed') {
      console.error('First agent failed with status:', run1Status);
      throw new Error(`First agent failed: ${run1Status.status}. ${run1Status.last_error?.message || ''}`);
    }

    // Get first agent result
    const messagesResponse1 = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse1.ok) {
      throw new Error('Failed to get messages');
    }

    const messages1 = await messagesResponse1.json();
    if (!messages1.data || messages1.data.length === 0) {
      throw new Error('No messages received from first agent');
    }
    
    const firstAgentResult = messages1.data[0].content[0].text.value;
    console.log('First agent result length:', firstAgentResult.length);
    console.log('First agent result preview:', firstAgentResult.substring(0, 500));
    
    // Parse all 20 segments
    const allSegments = parseAllSegments(firstAgentResult);
    console.log('\n✅ PARSED SEGMENTS:', allSegments.length);
    
    if (allSegments.length === 0) {
      throw new Error('No segments could be parsed from agent response');
    }
    
    console.log('Segment titles:', allSegments.map(s => `${s.id}. ${s.title}`).join('\n'));

    // === STEP 2: Second Agent - Select and detail top 3 ===
    console.log('\n=== STEP 2: SECOND AGENT (TOP 3 SELECTION) ===');
    
    // Create message for second agent with all segments
    const segmentsForSecondAgent = allSegments.map(s => 
      `Сегмент ${s.id}: ${s.title}\n${s.description}`
    ).join('\n\n');
    
    const secondAgentPrompt = `Вот ${allSegments.length} сегментов целевой аудитории для проекта "${projectName}":

${segmentsForSecondAgent}

Выбери ТОП-3 наиболее перспективных сегмента и для каждого предоставь:
1. Точное название сегмента (НЕ МЕНЯЙ названия!)
2. Расширенное описание с обоснованием выбора
3. Почему этот сегмент попал в топ-3

Формат ответа - JSON массив из 3 объектов:
[
  {
    "id": номер_сегмента,
    "title": "точное_название_как_в_исходном_списке",
    "description": "расширенное_описание_почему_этот_сегмент_важен",
    "reasoning": "обоснование_выбора"
  }
]`;

    console.log('Sending to second agent segments count:', allSegments.length);
    
    const secondMessageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: secondAgentPrompt
      })
    });

    if (!secondMessageResponse.ok) {
      throw new Error('Failed to add second message');
    }

    // Run second agent
    const assistantId2 = 'asst_JH2EvjSw5lSWyvC978FE9bDI';
    console.log('Running second assistant:', assistantId2);
    
    const runResponse2 = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId2
      })
    });

    if (!runResponse2.ok) {
      const errorText = await runResponse2.text();
      console.error('Second run creation failed:', errorText);
      throw new Error(`Failed to run second assistant: ${runResponse2.status}`);
    }

    const run2 = await runResponse2.json();
    console.log('Second agent run started:', run2.id);

    // Wait for second agent - reduced timeout
    let run2Status = run2;
    attempts = 0;
    const maxAttempts2 = 30; // 60 seconds max for second agent
    
    while (run2Status.status === 'queued' || run2Status.status === 'in_progress') {
      if (attempts >= maxAttempts2) {
        console.error('Second agent timeout after', attempts * 2, 'seconds');
        throw new Error('Второй агент превысил лимит времени (60 сек). Попробуйте еще раз.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run2.id}`, {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error('Second agent status check failed:', errorText);
          throw new Error(`Ошибка проверки статуса второго агента: ${statusResponse.status}`);
        }
        
        run2Status = await statusResponse.json();
        console.log(`🎯 Второй агент [${attempts + 1}/${maxAttempts2}]: ${run2Status.status}`);
      } catch (fetchError) {
        console.error('Network error checking second agent status:', fetchError);
        throw new Error('Ошибка сети при проверке второго агента');
      }
      
      attempts++;
    }

    if (run2Status.status !== 'completed') {
      console.error('Second agent failed:', run2Status);
      throw new Error(`Second agent failed: ${run2Status.status}. ${run2Status.last_error?.message || ''}`);
    }

    // Get second agent result
    const messagesResponse2 = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse2.ok) {
      throw new Error('Failed to get second agent messages');
    }

    const messages2 = await messagesResponse2.json();
    if (!messages2.data || messages2.data.length === 0) {
      throw new Error('No messages received from second agent');
    }
    
    const secondAgentResult = messages2.data[0].content[0].text.value;
    console.log('\nSecond agent raw response length:', secondAgentResult.length);
    console.log('Second agent response preview:', secondAgentResult.substring(0, 500));

    // Parse top 3 with enhanced descriptions
    const top3Data = parseTop3Enhanced(secondAgentResult, allSegments);
    console.log('\n✅ TOP 3 SELECTION:');
    console.log('Selected IDs:', top3Data.map(t => t.id));
    console.log('Selected titles:', top3Data.map(t => t.title));

    // Save to database if projectId provided
    if (projectId) {
      console.log('\n=== SAVING TO DATABASE ===');
      
      try {
        // Save generated_segments JSON to research
        const { error: updateError } = await supabase
          .from('researches')
          .update({ 
            status: 'awaiting_selection',
            segmentsCount: allSegments.length,
            generated_segments: allSegments,
            description: JSON.stringify({
              originalDescription: description.substring(0, 1000), // Limit size
              topSegments: top3Data.map(t => t.id),
              generatedAt: new Date().toISOString()
            })
          })
          .eq('Project ID', projectId);

        if (updateError) {
          console.error('Failed to update research:', updateError);
          // Continue anyway - don't fail the whole operation
        }

        // Сохраняем все 20 сегментов навсегда (НЕ удаляем существующие)
        // Проверяем, есть ли уже сегменты для этого проекта
        const { data: existingSegments } = await supabase
          .from('segments')
          .select('*')
          .eq('Project ID', projectId);

        // Только если сегментов еще нет, добавляем новые
        if (!existingSegments || existingSegments.length === 0) {
          const segmentsData = allSegments.map(segment => ({
            'Project ID': projectId,
            'Сегмент ID': segment.id,
            'Название сегмента': segment.title,
            description: segment.description,
            problems: segment.problems || null,  // Сохраняем поле problems
            message: segment.message || null     // Сохраняем поле message
          }));

          const { error: insertError } = await supabase
            .from('segments')
            .insert(segmentsData);
          
          if (insertError) {
            console.error('Failed to insert segments:', insertError);
          } else {
            console.log('✅ Segments saved successfully:', segmentsData.length);
          }
        } else {
          console.log('✅ Segments already exist, skipping creation');
        }

        // Clear existing top segments and save new ones
        console.log('🔄 Saving top segments to database...');
        await supabase
          .from('top_segments')
          .delete()
          .eq('project_id', projectId);

        // Save enhanced top-3 segments with CORRECT data from original segments
        for (let i = 0; i < top3Data.length; i++) {
          const topSegmentInfo = top3Data[i];
          // Находим оригинальный сегмент из allSegments по ID
          const originalSegment = allSegments.find(seg => seg.id === topSegmentInfo.id);
          
          if (!originalSegment) {
            console.error(`Could not find original segment with ID ${topSegmentInfo.id}`);
            continue;
          }
          
          console.log(`Saving top segment ${i + 1}:`, {
            id: originalSegment.id,
            title: originalSegment.title,
            hasReasoning: !!topSegmentInfo.reasoning
          });
          
          const { error: topError } = await supabase
            .from('top_segments')
            .insert({
              project_id: projectId,
              segment_id: originalSegment.id,
              rank: i + 1,
              title: originalSegment.title,                    // Используем правильное название из оригинального сегмента
              description: originalSegment.description,        // Используем правильное описание из оригинального сегмента
              reasoning: topSegmentInfo.reasoning || '',       // Обоснование от второго агента
              full_analysis: topSegmentInfo.reasoning || topSegmentInfo.enhancedDescription || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (topError) {
            console.error(`Failed to insert top segment ${i + 1}:`, topError);
          } else {
            console.log(`✅ Top segment ${i + 1} saved successfully`);
          }
        }

        console.log('✅ All data saved to database including top segments');
      } catch (dbError) {
        console.error('Database operations error:', dbError);
        // Continue - return results anyway
      }
    }

    // Return successful response
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    const response = {
      success: true,
      projectId,
      segments: allSegments,
      topSegments: top3Data.map(t => t.id),
      topSegmentsData: top3Data,
      resultText: firstAgentResult,
      duration: duration
    };
    
    console.log('\n🎉 === ANALYSIS COMPLETED SUCCESSFULLY ===');
    console.log('⏱️ Total duration:', duration, 'seconds');
    console.log('📊 Generated segments:', response.segments.length);
    console.log('🏆 Top segments:', response.topSegments);
    console.log('💾 Database updated:', projectId ? 'Yes' : 'No');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n❌ === ANALYSIS ERROR ===');
    console.error('Duration before error:', duration, 'seconds');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Update database with error if we have projectId
    if (projectId) {
      try {
        console.log('🔄 Updating database with error status...');
        await supabase
          .from('researches')
          .update({ 
            status: 'error',
            error_message: error.message 
          })
          .eq('Project ID', projectId);
        console.log('✅ Database updated with error status');
      } catch (updateError) {
        console.error('❌ Failed to update error status:', updateError);
      }
    }
    
    return new Response(JSON.stringify({
      error: error.message || 'Неизвестная ошибка при анализе',
      success: false,
      duration: duration
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Parse all segments from first agent - improved parsing
function parseAllSegments(text: string): Array<{ id: number; title: string; description: string; problems?: string; message?: string }> {
  const segments = [];
  
  console.log('Parsing segments from text of length:', text.length);
  
  try {
    // Try to find JSON in the text
    const jsonMatches = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match);
          
          // Handle array format
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const seg of parsed) {
              if (seg && (seg.title || seg.name || seg.segment)) {
                segments.push({
                  id: seg.id || segments.length + 1,
                  title: seg.title || seg.name || seg.segment || `Сегмент ${segments.length + 1}`,
                  description: seg.description || seg.details || seg.info || '',
                  problems: seg.problems || null,  // Добавляем поле problems
                  message: seg.message || null     // Добавляем поле message
                });
              }
            }
            if (segments.length > 0) {
              console.log('Successfully parsed JSON array with', segments.length, 'segments');
              return segments.slice(0, 20);
            }
          }
          
          // Handle object with segments property
          if (parsed.segments && Array.isArray(parsed.segments)) {
            for (const seg of parsed.segments) {
              if (seg && (seg.title || seg.name || seg.segment)) {
                segments.push({
                  id: seg.id || segments.length + 1,
                  title: seg.title || seg.name || seg.segment || `Сегмент ${segments.length + 1}`,
                  description: seg.description || seg.details || seg.info || '',
                  problems: seg.problems || null,  // Добавляем поле problems
                  message: seg.message || null     // Добавляем поле message
                });
              }
            }
            if (segments.length > 0) {
              console.log('Successfully parsed JSON object with', segments.length, 'segments');
              return segments.slice(0, 20);
            }
          }
        } catch (e) {
          // Continue to next match or fallback
        }
      }
    }
  } catch (e) {
    console.log('JSON parsing failed, trying text patterns');
  }
  
  // Fallback to text pattern matching
  // Pattern 1: Numbered format
  const numberedPattern = /(\d+)\.\s*([^\n]+?)(?:\n|$)([^\n]*(?:\n(?!\d+\.)[^\n]*)*)/g;
  const numberedMatches = [...text.matchAll(numberedPattern)];
  
  for (const match of numberedMatches) {
    const id = parseInt(match[1]);
    let title = match[2].trim();
    let description = match[3].trim();
    
    // Clean up title
    title = title.replace(/^(Название аудитории:|Сегмент:|Название:)\s*/i, '').trim();
    title = title.replace(/["']/g, '').trim();
    
    // Clean up description
    description = description.replace(/^(Краткая характеристика:|Описание:|Характеристика:)\s*/i, '').trim();
    
    if (id && title && title.length > 0) {
      segments.push({ id, title, description });
    }
  }
  
  // Pattern 2: Bullet points or dashes
  if (segments.length === 0) {
    const bulletPattern = /[•\-\*]\s*([^\n]+?)(?:\n|$)([^•\-\*\n]*(?:\n(?![•\-\*])[^\n]*)*)/g;
    const bulletMatches = [...text.matchAll(bulletPattern)];
    
    for (const match of bulletMatches) {
      const title = match[1].trim();
      const description = match[2].trim();
      
      if (title && title.length > 0) {
        segments.push({
          id: segments.length + 1,
          title: title.replace(/["']/g, '').trim(),
          description: description
        });
      }
    }
  }
  
  // If still no segments found, try to split by keywords
  if (segments.length === 0) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let currentSegment = null;
    
    for (const line of lines) {
      // Check if line looks like a segment title
      if (line.match(/^(Сегмент|Segment|\d+\.|\d+\)|[А-ЯA-Z][а-яa-z]+ (клиенты|пользователи|аудитория))/)) {
        if (currentSegment && currentSegment.title) {
          segments.push(currentSegment);
        }
        currentSegment = {
          id: segments.length + 1,
          title: line.replace(/^\d+[\.)\s]+/, '').replace(/^Сегмент\s*\d*:?\s*/, '').trim(),
          description: ''
        };
      } else if (currentSegment) {
        currentSegment.description += ' ' + line;
      }
    }
    
    if (currentSegment && currentSegment.title) {
      segments.push(currentSegment);
    }
  }
  
  // Clean up segments
  const cleanedSegments = segments
    .filter(s => s.title && s.title.length > 2)
    .map(s => ({
      ...s,
      title: s.title.substring(0, 100), // Limit title length
      description: s.description.substring(0, 500) // Limit description length
    }))
    .slice(0, 20);
  
  console.log('Parsed segments count:', cleanedSegments.length);
  
  // If still no segments, return error-indicating segments
  if (cleanedSegments.length === 0) {
    console.error('No segments could be parsed from text');
    return [
      { id: 1, title: 'Парсинг не удался', description: 'Не удалось извлечь сегменты из ответа ИИ' }
    ];
  }
  
  return cleanedSegments;
}

// Parse top 3 with enhanced descriptions from second agent
function parseTop3Enhanced(text: string, allSegments: Array<{ id: number; title: string; description: string }>) {
  console.log('\n=== PARSING TOP 3 ENHANCED ===');
  const top3Data = [];
  
  try {
    // Try to extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/); // Non-greedy match
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Parsed JSON from second agent:', parsed.length, 'items');
        
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            // Find matching segment
            let matchedSegment = null;
            
            // Try exact ID match first
            if (item.id) {
              matchedSegment = allSegments.find(s => s.id === item.id);
            }
            
            // Try title match if ID didn't work
            if (!matchedSegment && item.title) {
              // Try exact match
              matchedSegment = allSegments.find(s => 
                s.title.toLowerCase().trim() === item.title.toLowerCase().trim()
              );
              
              // Try partial match
              if (!matchedSegment) {
                matchedSegment = allSegments.find(s => 
                  s.title.toLowerCase().includes(item.title.toLowerCase()) ||
                  item.title.toLowerCase().includes(s.title.toLowerCase())
                );
              }
            }
            
            if (matchedSegment) {
              top3Data.push({
                id: matchedSegment.id,
                title: matchedSegment.title,
                description: matchedSegment.description,
                enhancedDescription: item.description || item.enhanced_description || matchedSegment.description,
                reasoning: item.reasoning || item.reason || item.justification || ''
              });
              console.log(`✅ Matched segment ${matchedSegment.id}: ${matchedSegment.title}`);
            } else {
              console.warn(`⚠️ Could not match segment from second agent:`, item);
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse JSON from second agent:', parseError);
      }
    }
    
    // Try text patterns if JSON parsing didn't work
    if (top3Data.length === 0) {
      console.log('Trying text pattern matching for top 3');
      
      // Look for numbered items or bullet points mentioning segments
      const patterns = [
        /(?:Топ-?\s*)?(?:1|первый|first)[\s\S]*?Сегмент\s*(\d+)[\s\S]*?([А-Я][^\n]+)/gi,
        /(?:Топ-?\s*)?(?:2|второй|second)[\s\S]*?Сегмент\s*(\d+)[\s\S]*?([А-Я][^\n]+)/gi,
        /(?:Топ-?\s*)?(?:3|третий|third)[\s\S]*?Сегмент\s*(\d+)[\s\S]*?([А-Я][^\n]+)/gi
      ];
      
      for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const segmentId = parseInt(match[1]);
          const matchedSegment = allSegments.find(s => s.id === segmentId);
          
          if (matchedSegment && !top3Data.find(t => t.id === matchedSegment.id)) {
            top3Data.push({
              id: matchedSegment.id,
              title: matchedSegment.title,
              description: matchedSegment.description,
              enhancedDescription: matchedSegment.description,
              reasoning: 'Выбран вторым агентом'
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error in parseTop3Enhanced:', e);
  }
  
  // If we still don't have enough segments, use intelligent fallback
  if (top3Data.length < 3) {
    console.log('Using intelligent fallback for remaining', 3 - top3Data.length, 'segments');
    
    // Prioritize segments with certain keywords
    const priorityKeywords = ['корпоратив', 'премиум', 'vip', 'бизнес', 'компан', 'событ', 'профессионал'];
    const usedIds = new Set(top3Data.map(t => t.id));
    
    // First pass: look for priority segments
    for (const segment of allSegments) {
      if (usedIds.has(segment.id)) continue;
      
      const hasKeyword = priorityKeywords.some(keyword => 
        segment.title.toLowerCase().includes(keyword) || 
        segment.description.toLowerCase().includes(keyword)
      );
      
      if (hasKeyword) {
        top3Data.push({
          id: segment.id,
          title: segment.title,
          description: segment.description,
          enhancedDescription: segment.description,
          reasoning: 'Приоритетный сегмент'
        });
        usedIds.add(segment.id);
        
        if (top3Data.length >= 3) break;
      }
    }
    
    // Second pass: use first available segments
    for (const segment of allSegments) {
      if (usedIds.has(segment.id)) continue;
      
      top3Data.push({
        id: segment.id,
        title: segment.title,
        description: segment.description,
        enhancedDescription: segment.description,
        reasoning: 'Дополнительный сегмент'
      });
      usedIds.add(segment.id);
      
      if (top3Data.length >= 3) break;
    }
  }
  
  console.log('Final top 3 selection:', top3Data.map(t => `${t.id}: ${t.title}`));
  return top3Data.slice(0, 3);
}