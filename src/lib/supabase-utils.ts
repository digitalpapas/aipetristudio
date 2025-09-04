import { supabase } from "@/integrations/supabase/client";

export interface Research {
  id: string;
  "Project ID": string;
  "User ID": string;
  "Project name": string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  segments?: Segment[];
  generated_segments?: any;
  segmentsCount?: number;
}

export interface Segment {
  id: string;
  "Project ID": string;
  "Сегмент ID": number;
  "Название сегмента": string;
  description?: string;
}

export interface SegmentAnalysis {
  id: string;
  "Project ID": string;
  "Сегмент ID": number;
  "Название сегмента"?: string;
  analysis_type: string;
  content?: any;
}

// Research operations
export async function createResearch(
  projectId: string, 
  userId: string, 
  projectName: string, 
  description?: string,
  status: string = 'generating'
): Promise<{ data: Research | null; error: any }> {
  const { data, error } = await supabase
    .from('researches')
    .insert({
      "Project ID": projectId,
      "User ID": userId,
      "Project name": projectName,
      description: description,
      status: status
    })
    .select()
    .single();

  return { data, error };
}

export async function updateResearch(
  projectId: string,
  updates: Partial<Research>
): Promise<{ data: Research | null; error: any }> {
  const { data, error } = await supabase
    .from('researches')
    .update(updates)
    .eq("Project ID", projectId)
    .select()
    .single();

  return { data, error };
}

export async function getResearch(projectId: string): Promise<{ data: Research | null; error: any }> {
  const { data, error } = await supabase
    .from('researches')
    .select('*')
    .eq("Project ID", projectId)
    .single();

  return { data, error };
}

export async function deleteResearch(projectId: string): Promise<{ error: any }> {
  // Сначала удаляем все анализы сегментов
  const { error: analysesError } = await supabase
    .from('segment_analyses')
    .delete()
    .eq("Project ID", projectId);

  if (analysesError) {
    console.error('Error deleting segment analyses:', analysesError);
  }

  // Затем удаляем все сегменты
  const { error: segmentsError } = await supabase
    .from('segments')
    .delete()
    .eq("Project ID", projectId);

  if (segmentsError) {
    console.error('Error deleting segments:', segmentsError);
  }

  // Наконец удаляем само исследование
  const { error: researchError } = await supabase
    .from('researches')
    .delete()
    .eq("Project ID", projectId);

  return { error: researchError };
}

export async function getUserResearches(userId: string): Promise<{ data: Research[] | null; error: any }> {
  const { data, error } = await supabase
    .from('researches')
    .select('*')
    .eq("User ID", userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function getResearchById(projectId: string): Promise<{ data: Research | null; error: any }> {
  const { data, error } = await supabase
    .from('researches')
    .select('*')
    .eq("Project ID", projectId)
    .single();

  return { data, error };
}

export async function getResearchSegmentCount(projectId: string): Promise<{ count: number; error: any }> {
  const { count, error } = await supabase
    .from('segments')
    .select('*', { count: 'exact', head: true })
    .eq("Project ID", projectId);

  return { count: count || 0, error };
}

// Segment operations
export async function saveSegments(
  projectId: string,
  segments: Array<{ id: number; title: string; description: string }>
): Promise<{ data: Segment[] | null; error: any }> {
  // НЕ удаляем существующие сегменты! Они должны сохраняться навсегда
  // Только обновляем или добавляем новые
  
  // Сначала проверяем, есть ли уже сегменты для этого проекта
  const { data: existingSegments } = await supabase
    .from('segments')
    .select('*')
    .eq('Project ID', projectId);

  // Если сегментов нет, добавляем все
  if (!existingSegments || existingSegments.length === 0) {
    const segmentData = segments.map(segment => ({
      "Project ID": projectId,
      "Сегмент ID": segment.id,
      "Название сегмента": segment.title,
      description: segment.description
    }));

    const { data, error } = await supabase
      .from('segments')
      .insert(segmentData)
      .select();

    return { data, error };
  }

  // Если сегменты уже есть, возвращаем существующие
  return { data: existingSegments as Segment[], error: null };
}

// Новая функция для отметки выбранных сегментов
export async function markSelectedSegments(
  projectId: string,
  selectedSegmentIds: number[]
): Promise<{ error: any }> {
  try {
    // Сначала сбрасываем все флаги is_selected для проекта
    await supabase
      .from('segments')
      .update({ is_selected: false })
      .eq('Project ID', projectId);

    // Затем отмечаем выбранные сегменты
    if (selectedSegmentIds.length > 0) {
      const { error } = await supabase
        .from('segments')
        .update({ is_selected: true })
        .eq('Project ID', projectId)
        .in('Сегмент ID', selectedSegmentIds);
      
      return { error };
    }
    
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function deleteSegment(projectId: string, segmentId: number): Promise<{ error: any }> {
  // Удаляем только анализы для этого сегмента, но НЕ сам сегмент
  // Сегменты должны сохраняться навсегда для возможности повторного анализа
  const { error: analysesError } = await supabase
    .from('segment_analyses')
    .delete()
    .eq("Project ID", projectId)
    .eq("Сегмент ID", segmentId);

  if (analysesError) {
    console.error('Error deleting segment analyses:', analysesError);
  }

  // НЕ удаляем сам сегмент!
  // const { error: segmentError } = await supabase
  //   .from('segments')
  //   .delete()
  //   .eq("Project ID", projectId)
  //   .eq("Сегмент ID", segmentId);

  return { error: analysesError };
}

export async function getSegments(projectId: string): Promise<{ data: Segment[] | null; error: any }> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq("Project ID", projectId)
    .order("Сегмент ID");

  return { data, error };
}

// Segment analysis operations
export async function saveSegmentAnalysis(
  projectId: string,
  segmentId: number,
  segmentName: string,
  analysisType: string,
  content: any
): Promise<{ data: SegmentAnalysis | null; error: any }> {
  const { data, error } = await supabase
    .from('segment_analyses')
    .insert({
      "Project ID": projectId,
      "Сегмент ID": segmentId,
      "Название сегмента": segmentName,
      analysis_type: analysisType,
      content: content
    })
    .select()
    .single();

  return { data, error };
}

export async function getSegmentAnalyses(
  projectId: string,
  segmentId: number
): Promise<{ data: SegmentAnalysis[] | null; error: any }> {
  const { data, error } = await supabase
    .from('segment_analyses')
    .select('*')
    .eq("Project ID", projectId)
    .eq("Сегмент ID", segmentId);

  return { data, error };
}

export async function getSegmentAnalysis(
  projectId: string,
  segmentId: number,
  analysisType: string
): Promise<{ data: SegmentAnalysis | null; error: any }> {
  const { data, error } = await supabase
    .from('segment_analyses')
    .select('*')
    .eq("Project ID", projectId)
    .eq("Сегмент ID", segmentId)
    .eq('analysis_type', analysisType)
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function deleteSegmentAnalysis(
  projectId: string,
  segmentId: number,
  analysisType: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('segment_analyses')
    .delete()
    .eq("Project ID", projectId)
    .eq("Сегмент ID", segmentId)
    .eq('analysis_type', analysisType);

  return { error };
}

export async function getCompletedAnalyses(
  projectId: string,
  segmentId: number
): Promise<{ data: Array<{ analysis_type: string }> | null; error: any }> {
  const { data, error } = await supabase
    .from('segment_analyses')
    .select('analysis_type')
    .eq("Project ID", projectId)
    .eq("Сегмент ID", segmentId);

  return { data, error };
}

// Migration utilities
export async function migrateLocalStorageToSupabase(userId: string): Promise<boolean> {
  try {
    // Get all research data from localStorage
    const allKeys = Object.keys(localStorage);
    const researchKeys = allKeys.filter(key => key.startsWith('research_'));
    
    for (const key of researchKeys) {
      const researchData = JSON.parse(localStorage.getItem(key) || '{}');
      const projectId = key.replace('research_', '');
      
      // Check if research already exists in Supabase
      const { data: existingResearch } = await getResearch(projectId);
      if (existingResearch) continue;
      
      // Create research in Supabase
      await createResearch(
        projectId,
        userId,
        researchData.title || 'Migrated Research',
        researchData.description
      );
      
      // Save segments if they exist
      const segmentsKey = `selectedSegments_${projectId}`;
      const savedSegments = localStorage.getItem(segmentsKey);
      if (savedSegments) {
        const segments = JSON.parse(savedSegments);
        await saveSegments(projectId, segments);
      }
      
      // Save segment analyses
      const analysesKeys = allKeys.filter(key => key.includes(`_${projectId}_`));
      for (const analysisKey of analysesKeys) {
        try {
          const analysisData = JSON.parse(localStorage.getItem(analysisKey) || '{}');
          const keyParts = analysisKey.split('_');
          const segmentId = parseInt(keyParts[keyParts.indexOf(projectId) + 1]);
          const analysisType = keyParts[keyParts.length - 1];
          
          if (!isNaN(segmentId) && analysisData.content) {
            await saveSegmentAnalysis(
              projectId,
              segmentId,
              analysisData.segmentName || '',
              analysisType,
              analysisData.content
            );
          }
        } catch (e) {
          console.warn('Failed to migrate analysis:', analysisKey, e);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// Bookmark functions
export async function saveBookmark(
  projectId: string,
  segmentId: number,
  analysisType: string,
  selectedText: string,
  contextBefore?: string,
  contextAfter?: string,
  note?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: user.id,
      project_id: projectId,
      segment_id: segmentId,
      analysis_type: analysisType,
      selected_text: selectedText,
      context_before: contextBefore,
      context_after: contextAfter,
      note: note
    })
    .select()
    .single();

  return { data, error };
}

export async function getBookmarks(projectId?: string, segmentId?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let query = supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  
  if (segmentId) {
    query = query.eq('segment_id', segmentId);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function deleteBookmark(bookmarkId: string) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId);

  return { error };
}