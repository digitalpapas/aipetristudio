import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SegmentAnalysisMenu from "@/components/dashboard/SegmentAnalysisMenu";
import SegmentAnalysisResult from "@/components/dashboard/SegmentAnalysisResult";
import FloatingAIAssistant from "@/components/dashboard/FloatingAIAssistant";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { Star, Download, Share2 } from "lucide-react";

export default function ResearchSegmentPage() {
  const { id, segmentId } = useParams();
  const { toast } = useCustomToast();
  const [segmentName, setSegmentName] = useState<string>(() => {
    // Попытка загрузить из localStorage для мгновенного отображения
    try {
      const cached = localStorage.getItem(`segment-name-${id}-${segmentId}`);
      return cached || "";
    } catch {
      return "";
    }
  });
  const [isLoadingSegmentName, setIsLoadingSegmentName] = useState<boolean>(true);
  const [isAssistantLocked, setIsAssistantLocked] = useState(true);
  const [missingAnalyses, setMissingAnalyses] = useState<string[]>([]);
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'menu' | 'result'>('menu');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('');

  // Список ВСЕХ обязательных анализов для разблокировки
  const REQUIRED_ANALYSES = [
    'segment_description',
    'bdf_analysis', 
    'problems_analysis',
    'solutions_analysis',
    'jtbd_analysis',
    'content_themes',
    'user_personas',
    'niche_integration',
    'final_report'
  ];

  // Обработчики для кнопок Export и Share
  const handleExport = () => {
    toast({ 
      type: "info",
      title: "В разработке",
      description: "Функция экспорта скоро будет доступна"
    });
  };

  const handleShare = () => {
    toast({ 
      type: "info",
      title: "В разработке",
      description: "Функция поделиться скоро будет доступна"
    });
  };

  useEffect(() => {
    // Загружаем название сегмента
    const loadSegmentName = async () => {
      if (!id || !segmentId) return;
      
      console.log('🔍 Loading segment name for:', { id, segmentId });
      
      try {
        const { data, error } = await supabase
          .from('segments')
          .select('*')
          .eq('Project ID', id)
          .eq('Сегмент ID', parseInt(segmentId))
          .single();
        
        console.log('📋 Segment name query result:', { data, error });
        
        if (data && data['Название сегмента']) {
          console.log('✅ Setting segment name:', data['Название сегмента']);
          setSegmentName(data['Название сегмента']);
          document.title = `${data['Название сегмента']} — подробный анализ`;
          
          // Сохраняем в localStorage для быстрого показа в следующий раз
          localStorage.setItem(`segment-name-${id}-${segmentId}`, data['Название сегмента']);
        }
      } catch (error) {
        console.error('❌ Error loading segment name:', error);
      } finally {
        setIsLoadingSegmentName(false);
      }
    };
    
    loadSegmentName();
    
    if (!segmentName) {
      document.title = `Сегмент ${segmentId} — подробный анализ`;
    }
    const desc = `Подробный анализ сегмента ${segmentId} в исследовании ${id}.`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);

    // Сброс состояния при изменении сегмента
    setCurrentView('menu');
    setSelectedAnalysisType('');
  }, [id, segmentId]);

  const checkAnalysesCompletion = async () => {
    if (!id || !segmentId) return;
    
    console.log('Checking analyses completion for segment:', segmentId);
    
    try {
      const { data } = await supabase
        .from('segment_analyses')
        .select('analysis_type')
        .eq('Project ID', id)
        .eq('Сегмент ID', parseInt(segmentId));
      
      const completedTypes = data?.map(d => d.analysis_type) || [];
      console.log('Completed analyses:', completedTypes);
      
      // Находим недостающие анализы
      const missing = REQUIRED_ANALYSES.filter(
        requiredType => !completedTypes.includes(requiredType)
      );
      
      console.log('Missing analyses:', missing);
      
      setMissingAnalyses(missing);
      setIsAssistantLocked(missing.length > 0);
    } catch (error) {
      console.error('Error checking analyses:', error);
      setIsAssistantLocked(true); // Блокируем при ошибке
    }
  };

  // Проверка при монтировании
  useEffect(() => {
    checkAnalysesCompletion();
  }, [id, segmentId]);

  // Real-time подписка на изменения
  useEffect(() => {
    if (!id || !segmentId) return;

    const channel = supabase
      .channel('analyses-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'segment_analyses',
          filter: `"Project ID"=eq.${id} AND "Сегмент ID"=eq.${segmentId}`
        },
        (payload) => {
          console.log('Analysis changed:', {
            event: payload.eventType,
            segmentId: (payload.new as any)?.['Сегмент ID'] || (payload.old as any)?.['Сегмент ID'],
            analysisType: (payload.new as any)?.analysis_type || (payload.old as any)?.analysis_type
          });
          
          // Проверяем, что изменение относится к текущему сегменту
          const affectedSegmentId = (payload.new as any)?.['Сегмент ID'] || (payload.old as any)?.['Сегмент ID'];
          if (affectedSegmentId === parseInt(segmentId)) {
            checkAnalysesCompletion();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, segmentId]);

  return (
    <main className="flex flex-col min-h-full">
      {currentView === 'menu' && segmentName && (
        <>
          <PageHeader
            backUrl={`/dashboard/research/${id}#selected-segments`}
            backLabel="Назад к исследованию"
            title={segmentName}
            subtitle="Подробный анализ"
          />
          <div className="-mt-2 mb-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Экспорт</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Поделиться</span>
            </Button>
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        {currentView === 'menu' ? (
          <SegmentAnalysisMenu 
            researchId={id!}
            segmentId={segmentId!}
            onAnalysisStart={(selectedOptions) => {
              console.log("Анализ запущен для опций:", selectedOptions);
            }}
            onViewResult={(analysisType) => {
              setSelectedAnalysisType(analysisType);
              setCurrentView('result');
            }}
          />
        ) : (
          <SegmentAnalysisResult
            researchId={id!}
            segmentId={segmentId!}
            analysisType={selectedAnalysisType}
            onBack={() => setCurrentView('menu')}
          />
        )}
      </div>
      
      {/* AI Ассистент доступен только в меню анализа */}
      {currentView === 'menu' && (
        <FloatingAIAssistant
          key={`assistant-${missingAnalyses.length}-${missingAnalyses.join(',')}`}
          segmentName={segmentName}
          segmentId={segmentId}
          researchId={id}
          isLocked={isAssistantLocked}
          missingAnalyses={missingAnalyses}
          context="segment"
        />
      )}
    </main>
  );
}
