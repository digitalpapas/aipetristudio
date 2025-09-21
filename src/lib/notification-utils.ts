import { supabase } from "@/integrations/supabase/client";

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message?: string;
  type: 'research' | 'system' | 'reminder';
  action_url?: string;
}

// Создать уведомление с валидацией
export const createNotification = async (data: CreateNotificationData) => {
  try {
    const { data: result, error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        title: data.title,
        message: data.message || null,
        type: data.type,
        action_url: data.action_url || null,
        research_id: null,
        segment_id: null
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, notificationId: result?.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
};

// Создать уведомление о завершении исследования
export const createResearchCompletedNotification = async (
  userId: string,
  projectName: string,
  projectId: string
) => {
  try {
    const { data: result, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Исследование завершено',
        message: `Ваше исследование "${projectName}" готово к просмотру`,
        type: 'research',
        action_url: `/dashboard/research/${projectId}`,
        research_id: projectId,
        segment_id: null
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, notificationId: result?.id };
  } catch (error) {
    console.error('Error creating research notification:', error);
    return { success: false, error };
  }
};

// Создать уведомление о завершении анализа сегмента
export const createSegmentAnalysisNotification = async (
  userId: string,
  analysisName: string,
  projectId: string,
  segmentId: number,
  segmentName?: string
) => {
  try {
    const { data: result, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Анализ сегмента завершен',
        message: `Анализ "${analysisName}" для сегмента ${segmentName || segmentId} готов к просмотру`,
        type: 'research',
        action_url: `/dashboard/research/${projectId}/segment/${segmentId}`,
        research_id: projectId,
        segment_id: segmentId
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, notificationId: result?.id };
  } catch (error) {
    console.error('Error creating segment analysis notification:', error);
    return { success: false, error };
  }
};

// Создать системное уведомление
export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string,
  actionUrl?: string
) => {
  return createNotification({
    user_id: userId,
    title,
    message,
    type: 'system',
    action_url: actionUrl
  });
};

// Создать напоминание
export const createReminderNotification = async (
  userId: string,
  title: string,
  message: string,
  actionUrl?: string
) => {
  return createNotification({
    user_id: userId,
    title,
    message,
    type: 'reminder',
    action_url: actionUrl
  });
};

// Создать уведомление об ошибке анализа
export const createAnalysisErrorNotification = async (
  userId: string,
  analysisType: string,
  projectId: string,
  segmentId: number,
  errorMessage: string = 'Произошла ошибка во время анализа'
) => {
  try {
    const { data: result, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Ошибка анализа',
        message: `${errorMessage}. Попробуйте запустить анализ еще раз.`,
        type: 'system',
        action_url: `/dashboard/research/${projectId}/segment/${segmentId}`,
        research_id: projectId,
        segment_id: segmentId
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, notificationId: result?.id };
  } catch (error) {
    console.error('Error creating analysis error notification:', error);
    return { success: false, error };
  }
};