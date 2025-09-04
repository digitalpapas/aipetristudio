import { supabase } from '@/integrations/supabase/client';

export async function analyzeWithAI(
  systemPrompt: string, 
  userMessage: string,
  threadId?: string
): Promise<{ response: string; threadId?: string }> {
  try {
    console.log('Calling AI assistant with thread:', threadId);
    
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        systemPrompt,
        userMessage,
        threadId
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(error.message || 'Ошибка при вызове AI-ассистента');
    }

    if (!data || !data.response) {
      throw new Error('Некорректный ответ от AI-ассистента');
    }

    return {
      response: data.response,
      threadId: data.threadId
    };
  } catch (error) {
    console.error('Error calling AI assistant:', error);
    throw error;
  }
}