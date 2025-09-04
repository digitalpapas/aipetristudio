// Утилита для диагностики проблем с исследованиями
export async function diagnoseResearch(researchId: string) {
  const diagnostics = {
    id: researchId,
    localStorage: null as any,
    sessionStorage: null as any,
    supabase: null as any,
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    // Check localStorage
    const localData = JSON.parse(localStorage.getItem('research') || '[]');
    diagnostics.localStorage = localData.find((r: any) => r.id === researchId);

    // Check sessionStorage
    const sessionKey = `research_cache_${researchId}`;
    const sessionData = sessionStorage.getItem(sessionKey);
    if (sessionData) {
      diagnostics.sessionStorage = JSON.parse(sessionData);
    }

    // Check Supabase (needs supabase client)
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('researches')
      .select('*')
      .eq('Project ID', researchId)
      .single();

    if (error) {
      diagnostics.errors.push(`Supabase error: ${error.message}`);
    } else {
      diagnostics.supabase = data;
    }

    // Check for segments
    const { data: segments, error: segError } = await supabase
      .from('segments')
      .select('*')
      .eq('Project ID', researchId);

    if (!segError && segments) {
      diagnostics.supabase.segments = segments;
    }

    // Check for top segments
    const { data: topSegments, error: topError } = await supabase
      .from('top_segments')
      .select('*')
      .eq('project_id', researchId);

    if (!topError && topSegments) {
      diagnostics.supabase.topSegments = topSegments;
    }

    // Analyze issues
    if (diagnostics.supabase) {
      const status = diagnostics.supabase.status;
      
      if (status === 'awaiting_selection' && !diagnostics.supabase.generated_segments) {
        diagnostics.warnings.push('Status is awaiting_selection but no generated_segments found');
      }

      if (status === 'processing' || status === 'generating') {
        diagnostics.warnings.push('Research is still processing');
      }

      if (status === 'error') {
        diagnostics.errors.push(`Research has error status: ${diagnostics.supabase.error_message || 'Unknown error'}`);
      }
    }

    // Check data consistency
    if (diagnostics.localStorage && diagnostics.supabase) {
      if (diagnostics.localStorage.status !== diagnostics.supabase.status) {
        diagnostics.warnings.push(`Status mismatch: localStorage=${diagnostics.localStorage.status}, supabase=${diagnostics.supabase.status}`);
      }
    }

  } catch (error) {
    diagnostics.errors.push(`Diagnostic error: ${error}`);
  }

  return diagnostics;
}

// Утилита для очистки зависших исследований
export async function cleanupStuckResearch(researchId: string) {
  try {
    // Clear all caches
    sessionStorage.removeItem(`research_cache_${researchId}`);
    sessionStorage.removeItem(`research_segments_${researchId}`);
    
    // Remove from localStorage
    const localData = JSON.parse(localStorage.getItem('research') || '[]');
    const filtered = localData.filter((r: any) => r.id !== researchId);
    localStorage.setItem('research', JSON.stringify(filtered));

    // Update Supabase status if stuck
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('researches')
      .select('status')
      .eq('Project ID', researchId)
      .single();

    if (!error && data) {
      if (data.status === 'processing' || data.status === 'generating') {
        // Mark as error if stuck in processing
        await supabase
          .from('researches')
          .update({ 
            status: 'error',
            error_message: 'Process timeout - please retry'
          })
          .eq('Project ID', researchId);
      }
    }

    return { success: true, message: 'Cleanup completed' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Утилита для форсированного обновления статуса
export async function forceRefreshResearch(researchId: string) {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get fresh data from Supabase
    const { data: research, error } = await supabase
      .from('researches')
      .select('*')
      .eq('Project ID', researchId)
      .single();

    if (error) throw error;

    // Get segments
    const { data: segments } = await supabase
      .from('segments')
      .select('*')
      .eq('Project ID', researchId);

    // Get top segments
    const { data: topSegments } = await supabase
      .from('top_segments')
      .select('*')
      .eq('project_id', researchId)
      .order('rank');

    // Update caches
    if (research) {
      // Update sessionStorage
      sessionStorage.setItem(`research_cache_${researchId}`, JSON.stringify({
        title: research["Project name"],
        "Project name": research["Project name"],
        description: research.description,
        status: research.status,
        generated_segments: research.generated_segments
      }));

      if (segments && segments.length > 0) {
        const formattedSegments = segments.map(s => ({
          id: s['Сегмент ID'],
          title: s['Название сегмента'],
          description: s.description
        }));
        sessionStorage.setItem(`research_segments_${researchId}`, JSON.stringify(formattedSegments));
      }
    }

    return {
      success: true,
      research,
      segments,
      topSegments,
      status: research?.status
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
