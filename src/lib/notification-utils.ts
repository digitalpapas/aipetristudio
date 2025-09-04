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
      .rpc('create_validated_notification', {
        p_user_id: data.user_id,
        p_title: data.title,
        p_message: data.message || null,
        p_type: data.type,
        p_action_url: data.action_url || null,
        p_research_id: null,
        p_segment_id: null
      });

    if (error) throw error;
    return { success: true, notificationId: result };
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
      .rpc('create_validated_notification', {
        p_user_id: userId,
        p_title: 'Исследование завершено',
        p_message: `Ваше исследование "${projectName}" готово к просмотру`,
        p_type: 'research',
        p_action_url: `/dashboard/research/${projectId}`,
        p_research_id: projectId,
        p_segment_id: null
      });

    if (error) throw error;
    return { success: true, notificationId: result };
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
      .rpc('create_validated_notification', {
        p_user_id: userId,
        p_title: 'Анализ сегмента завершен',
        p_message: `Анализ "${analysisName}" для сегмента ${segmentName || segmentId} готов к просмотру`,
        p_type: 'research',
        p_action_url: `/dashboard/research/${projectId}/segment/${segmentId}`,
        p_research_id: projectId,
        p_segment_id: segmentId
      });

    if (error) throw error;
    return { success: true, notificationId: result };
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
      .rpc('create_validated_notification', {
        p_user_id: userId,
        p_title: 'Ошибка анализа',
        p_message: `${errorMessage}. Попробуйте запустить анализ еще раз.`,
        p_type: 'system',
        p_action_url: `/dashboard/research/${projectId}/segment/${segmentId}`,
        p_research_id: projectId,
        p_segment_id: segmentId
      });

    if (error) throw error;
    return { success: true, notificationId: result };
  } catch (error) {
    console.error('Error creating analysis error notification:', error);
    return { success: false, error };
  }
};