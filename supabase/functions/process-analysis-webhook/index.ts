import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// OpenAI response format interface
interface OpenAIResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created_at: number;
    assistant_id: string;
    thread_id: string;
    run_id: string;
    role: string;
    content: Array<{
      type: string;
      text: {
        value: string;
      };
    }>;
  }>;
}

// Legacy format interface
interface LegacyPayload {
  data: {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };
  analysisData: {
    research_id: string;
    segment_id: number;
    analysis_type: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'Webhook is active' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('Received payload:', JSON.stringify(payload, null, 2));

    // Добавляем задержку в 1 минуту перед обработкой данных
    console.log('Webhook received data, waiting 1 minute before processing...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 секунд = 1 минута
    console.log('1 minute delay completed, starting data processing...');

    let extractedData: {
      research_id: string;
      segment_id: number;
      analysis_type: string;
      content: string;
    } | null = null;

    // Check if it's an OpenAI response format (new format)
    if (payload.object === 'list' && payload.data && Array.isArray(payload.data)) {
      console.log('Processing OpenAI format response');
      const openAIPayload = payload as OpenAIResponse;
      
      if (openAIPayload.data.length > 0 && 
          openAIPayload.data[0].content && 
          openAIPayload.data[0].content.length > 0 &&
          openAIPayload.data[0].content[0].text) {
        
        const content = openAIPayload.data[0].content[0].text.value;
        console.log('Extracted content from OpenAI response');
        
        // First try to get metadata from request body (primary method)
        if (payload.research_id && payload.segment_id && payload.analysis_type) {
          extractedData = {
            research_id: payload.research_id,
            segment_id: parseInt(payload.segment_id),
            analysis_type: payload.analysis_type,
            content: content
          };
          console.log('Extracted metadata from request body:', extractedData);
        } else {
          // Fallback: try to get metadata from URL path for backwards compatibility
          const url = new URL(req.url);
          const pathMatch = url.pathname.match(/\/research\/([^\/]+)\/segment\/(\d+)\/analysis\/([^\/]+)/);
          
          if (pathMatch) {
            extractedData = {
              research_id: pathMatch[1],
              segment_id: parseInt(pathMatch[2]),
              analysis_type: pathMatch[3],
              content: content
            };
            console.log('Extracted metadata from URL (fallback):', extractedData);
          } else {
            console.error('Could not extract metadata from either request body or URL');
            return new Response(JSON.stringify({ 
              error: 'Could not extract research_id, segment_id, analysis_type. Please include them in request body or URL path' 
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      }
    } 
    // Check if it's a legacy format with analysisData
    else if (payload.data?.choices || payload.analysisData) {
      console.log('Processing legacy format');
      const legacyPayload = payload as LegacyPayload;
      
      if (legacyPayload.data?.choices?.[0]?.message?.content && legacyPayload.analysisData) {
        extractedData = {
          research_id: legacyPayload.analysisData.research_id,
          segment_id: legacyPayload.analysisData.segment_id,
          analysis_type: legacyPayload.analysisData.analysis_type,
          content: legacyPayload.data.choices[0].message.content
        };
        console.log('Extracted data from legacy format:', extractedData);
      }
    }
    // Check if it's a plain text response with metadata in request body (new external service format)
    else if (typeof payload === 'string' || (payload.projectID && payload.selectedAnalysis)) {
      console.log('Processing external service format with plain text response');
      
      let content: string;
      let research_id: string;
      let segment_id: number;
      let analysis_type: string;
      
      // If payload is a string, it's the analysis content
      if (typeof payload === 'string') {
        content = payload;
        // Try to get metadata from URL path
        const url = new URL(req.url);
        const pathMatch = url.pathname.match(/\/research\/([^\/]+)\/segment\/(\d+)\/analysis\/([^\/]+)/);
        
        if (pathMatch) {
          research_id = pathMatch[1];
          segment_id = parseInt(pathMatch[2]);
          analysis_type = pathMatch[3];
        } else {
          console.error('Could not extract metadata from URL for plain text response');
          return new Response(JSON.stringify({ 
            error: 'Could not extract metadata from URL path for plain text response' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        // Metadata is in the request body, content should be in a 'content' field or the whole response
        content = payload.content || JSON.stringify(payload);
        research_id = payload.projectID || payload.researchId;
        segment_id = parseInt(payload.segmentID || payload.segmentId);
        
        // Map selectedAnalysis to our analysis_type format
        const analysisMapping: { [key: string]: string } = {
          'BDF': 'bdf_analysis',
          'Problems': 'problems_analysis',
          'Solutions': 'solutions_analysis',
          'JTBD': 'jtbd_analysis',
          'Personas': 'user_personas',
          'Content': 'content_themes',
          'Niche': 'niche_integration',
          'Description': 'segment_description'
        };
        
        analysis_type = analysisMapping[payload.selectedAnalysis] || payload.selectedAnalysis?.toLowerCase();
      }
      
      if (research_id && segment_id && analysis_type && content) {
        extractedData = {
          research_id,
          segment_id,
          analysis_type,
          content
        };
        console.log('Extracted data from external service format:', extractedData);
      }
    }
    // Check if it's direct format with research_id, segment_id, analysis_type, content
    else if (payload.research_id && payload.segment_id && payload.analysis_type && payload.content) {
      console.log('Processing direct format with all required fields');
      
      extractedData = {
        research_id: payload.research_id,
        segment_id: parseInt(payload.segment_id),
        analysis_type: payload.analysis_type,
        content: payload.content
      };
      console.log('Extracted data from direct format:', extractedData);
    }
    // Специальная проверка для initial_research
    else if (payload.research_id && payload.analysis_type === 'initial_research') {
      console.log('Processing initial research format');
      
      extractedData = {
        research_id: payload.research_id,
        segment_id: 0, // Для initial_research нет segment_id
        analysis_type: payload.analysis_type,
        content: payload.content || payload.result || ''
      };
      
      console.log('Extracted data for initial research:', extractedData);
    }

    if (!extractedData) {
      console.error('Could not extract required data from payload');
      return new Response(JSON.stringify({ 
        error: 'Invalid payload format. Expected OpenAI format with data[0].content[0].text.value or legacy format with analysisData' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { research_id, segment_id, analysis_type, content } = extractedData;

    // Специальная обработка для начального исследования
    if (analysis_type === 'initial_research') {
      console.log('Processing initial research result');
      
      try {
        // 1. Обновляем статус исследования на completed
        const { error: updateError } = await supabase
          .from('researches')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('"Project ID"', research_id);
        
        if (updateError) {
          console.error('Error updating research status:', updateError);
          throw updateError;
        }
        
        console.log('Research status updated to completed');
        
        // 2. Парсим сегменты из контента
        let segments = [];
        
        // Если контент - это JSON массив сегментов
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            segments = parsed;
          } else if (parsed.segments && Array.isArray(parsed.segments)) {
            segments = parsed.segments;
          }
          console.log('Parsed segments from JSON:', segments.length);
        } catch {
          // Если не JSON, парсим текст
          // Ищем паттерн: "1. Название: ... Описание: ..."
          const segmentMatches = content.match(/(\d+)\.\s*([^:]+?)(?:\s*[-–—:]\s*)([^0-9]+?)(?=\d+\.|$)/g);
          
          if (segmentMatches) {
            segments = segmentMatches.map((match, index) => {
              const nameMatch = match.match(/\d+\.\s*([^:–—-]+)/);
              const descMatch = match.match(/(?:[-–—:]\s*)(.+)/s);
              
              return {
                id: index + 1,
                name: nameMatch ? nameMatch[1].trim() : `Сегмент ${index + 1}`,
                description: descMatch ? descMatch[1].trim() : 'Описание недоступно'
              };
            });
          }
          console.log('Parsed segments from text:', segments.length);
        }
        
        // 3. Создаем записи сегментов в БД
        if (segments.length > 0) {
          for (const segment of segments) {
            const { error: segmentError } = await supabase
              .from('segments')
              .insert({
                '"Project ID"': research_id,
                '"Сегмент ID"': segment.id || segments.indexOf(segment) + 1,
                '"Название сегмента"': segment.name || segment.title || `Сегмент ${segment.id || segments.indexOf(segment) + 1}`,
                'description': segment.description || 'Описание недоступно'
              });
            
            if (segmentError) {
              console.error('Error creating segment:', segmentError);
            } else {
              console.log('Created segment:', segment.name || segment.title);
            }
          }
        }
        
        // 4. Получаем данные пользователя для уведомления
        const { data: researchData } = await supabase
          .from('researches')
          .select('"User ID", "Project name"')
          .eq('"Project ID"', research_id)
          .single();
        
        if (researchData) {
          // 5. Создаем уведомление
          await supabase.rpc('create_validated_notification', {
            p_user_id: researchData["User ID"],
            p_title: 'Исследование завершено',
            p_message: `Исследование "${researchData["Project name"]}" готово. Найдено ${segments.length} сегментов.`,
            p_type: 'research',
            p_action_url: `/dashboard/research/${research_id}`,
            p_research_id: research_id,
            p_segment_id: null
          });
          
          console.log('Notification created for initial research completion');
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Initial research processed successfully',
          research_id: research_id,
          segments_created: segments.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (error) {
        console.error('Error processing initial research:', error);
        
        // Обновляем статус на error
        await supabase
          .from('researches')
          .update({ status: 'error' })
          .eq('"Project ID"', research_id);
        
        return new Response(JSON.stringify({ 
          error: 'Failed to process initial research',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Update analysis_jobs if the job exists
    try {
      const { error: jobUpdateError } = await supabase
        .from('analysis_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('research_id', research_id)
        .eq('segment_id', segment_id)
        .eq('analysis_type', analysis_type);
      
      if (jobUpdateError) {
        console.log('Analysis job not found or error updating:', jobUpdateError);
      } else {
        console.log('Analysis job updated successfully');
      }
    } catch (jobError) {
      console.error('Error updating analysis job:', jobError);
      // Continue with saving the result even if job update fails
    }

    // Save analysis result directly to segment_analyses
    console.log('Saving analysis to segment_analyses table');
    const { data: analysisData, error: saveError } = await supabase
      .from('segment_analyses')
      .upsert({
        "Project ID": research_id,
        "Сегмент ID": segment_id,
        "Название сегмента": payload.segment_name || payload.segmentName || `Сегмент ${segment_id}`,
        analysis_type: analysis_type,
        content: { response: content }
      })
      .select();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save analysis' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Analysis saved successfully:', analysisData);

    // Get analysis display name for notification
    const { data: displayNameData } = await supabase
      .rpc('get_analysis_display_name', { analysis_type });
    
    const displayName = displayNameData || analysis_type;

    // Get user_id from research
    const { data: researchData } = await supabase
      .from('researches')
      .select('"User ID"')
      .eq('"Project ID"', research_id)
      .single();

    if (researchData) {
      // Create notification
      await supabase.rpc('create_validated_notification', {
        p_user_id: researchData["User ID"],
        p_title: 'Анализ завершен',
        p_message: `${displayName} для сегмента ${segment_id} готов к просмотру`,
        p_type: 'analysis',
        p_action_url: `/dashboard/research/${research_id}/segment/${segment_id}`,
        p_research_id: research_id,
        p_segment_id: segment_id
      });
      
      console.log('Notification created successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Analysis processed and saved successfully',
      analysis_type: analysis_type,
      research_id: research_id,
      segment_id: segment_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});