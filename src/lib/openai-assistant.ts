import { supabase } from '@/integrations/supabase/client';
import { getSegmentAnalysis } from '@/lib/supabase-utils';

// Зависимости для каждого типа анализа (какие анализы нужны как входные данные)
const ANALYSIS_DEPENDENCIES: Record<string, string[]> = {
  segment_description: [],
  bdf_analysis: ['segment_description'],
  problems_analysis: ['segment_description'],
  solutions_analysis: ['segment_description', 'problems_analysis'],
  jtbd_analysis: ['segment_description'],
  user_personas: ['segment_description'],
  content_themes: ['segment_description', 'bdf_analysis', 'problems_analysis', 'solutions_analysis', 'jtbd_analysis', 'user_personas'],
  niche_integration: ['segment_description', 'bdf_analysis', 'problems_analysis', 'solutions_analysis', 'jtbd_analysis', 'user_personas', 'content_themes'],
  final_report: ['segment_description', 'bdf_analysis', 'problems_analysis', 'solutions_analysis', 'jtbd_analysis', 'user_personas', 'content_themes', 'niche_integration']
};

interface AnalysisRequest {
  researchId: string;
  segmentId: number;
  segmentName: string;
  segmentDescription: string;
  analysisType: string;
}

interface AnalysisResponse {
  text: string;
}

// Вспомогательная функция для получения зависимых данных
async function getDependencyData(
  researchId: string, 
  segmentId: number, 
  dependencies: string[]
): Promise<Record<string, string>> {
  const dependencyData: Record<string, string> = {};
  
  for (const dep of dependencies) {
    const { data, error } = await getSegmentAnalysis(researchId, segmentId, dep);
    
    if (data && data.content) {
      // Парсим контент в зависимости от формата
      let text = '';
      
      if (typeof data.content === 'string') {
        try {
          const parsed = JSON.parse(data.content);
          text = parsed.text || data.content;
        } catch {
          text = data.content;
        }
      } else if (data.content.text) {
        text = data.content.text;
      } else if (data.content.analysis_result) {
        text = data.content.analysis_result;
      }
      
      dependencyData[dep] = text;
    }
  }
  
  return dependencyData;
}


// Основная функция для анализа
export async function analyzeSegment(request: AnalysisRequest): Promise<AnalysisResponse> {
  try {
    console.log('Вызов Edge Function analyze-segment с параметрами:', {
      segmentName: request.segmentName,
      analysisType: request.analysisType
    });

    // Получаем зависимые данные
    const dependencies = ANALYSIS_DEPENDENCIES[request.analysisType] || [];
    const dependencyData = await getDependencyData(
      request.researchId, 
      request.segmentId, 
      dependencies
    );

    // Вызываем Edge Function
    const { data, error } = await supabase.functions.invoke('analyze-segment', {
      body: {
        segmentName: request.segmentName,
        segmentDescription: request.segmentDescription,
        analysisType: request.analysisType,
        dependencies: dependencyData
      }
    });

    console.log('Ответ от Edge Function:', { data, error });

    if (error) {
      console.error('Edge Function error details:', error);
      
      // Проверяем специфические ошибки
      if (error.message?.includes('not found')) {
        throw new Error('Edge Function не найдена. Убедитесь что функция задеплоена: supabase functions deploy analyze-segment');
      }
      if (error.message?.includes('OpenAI API key')) {
        throw new Error('OpenAI API ключ не настроен в Supabase Secrets');
      }
      
      throw new Error(error.message || 'Ошибка при вызове Edge Function');
    }

    if (!data || !data.text) {
      console.error('Некорректный ответ от Edge Function:', data);
      throw new Error('Некорректный ответ от Edge Function');
    }

    return { text: data.text };
    
  } catch (error) {
    console.error(`Детальная ошибка при анализе ${request.analysisType}:`, error);
    
    // Добавляем более информативное сообщение
    if (error instanceof Error) {
      if (error.message.includes('FunctionsHttpError')) {
        throw new Error('Ошибка подключения к Edge Function. Проверьте деплой функции.');
      }
      if (error.message.includes('FunctionsRelayError')) {
        throw new Error('Edge Function не отвечает. Проверьте логи в Supabase Dashboard.');
      }
      if (error.message.includes('FunctionsFetchError')) {
        throw new Error('Не удалось вызвать Edge Function. Проверьте настройки проекта.');
      }
    }
    
    throw error;
  }
}