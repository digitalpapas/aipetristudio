import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { useAuth } from "@/contexts/AuthContext";
import { saveSegmentAnalysis, getCompletedAnalyses } from "@/lib/supabase-utils";

import { analyzeSegment } from "@/lib/openai-assistant";
import { supabase } from "@/integrations/supabase/client";
import { Play, CheckCircle2, Clock, Brain, AlertTriangle, Wrench, Target, MessageSquare, Users, FileText, Lock, Trash2, CheckCheck, AlertCircle, Sparkles, Zap, Trophy, XCircle, Eye, Lightbulb } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteSegmentAnalysis } from "@/lib/supabase-utils";

// Функция для правильного склонения слова "анализ"
const getAnalysisWord = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "анализов";
  }
  
  if (lastDigit === 1) {
    return "анализ";
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return "анализа";
  }
  
  return "анализов";
};

// Функция для получения правильной формы глагола
const getVerbForm = (count: number): string => {
  return count === 1 ? "завершен" : "завершены";
};

interface AnalysisOption {
  id: string;
  name: string;
  category: string;
  description?: string;
  required?: boolean;
}

interface SegmentAnalysisMenuProps {
  researchId: string;
  segmentId: string;
  onAnalysisStart?: (selectedOptions: string[]) => void;
  onViewResult?: (analysisType: string) => void;
}

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  // Сегмент (обязательный)
  { id: "segment_description", name: "Описание сегмента", category: "segment", required: true, description: "Базовый анализ сегмента аудитории" },
  
  // Основные категории анализа
  { id: "bdf_analysis", name: "BDF", category: "analysis", description: "Комплексный анализ убеждений, желаний и чувств аудитории" },
  { id: "problems_analysis", name: "Боли страхи потребности возражения", category: "analysis", description: "Анализ проблематики и барьеров аудитории" },
  { id: "solutions_analysis", name: "Работа с болями страхами потребностями и возражениями", category: "analysis", description: "Стратегии работы с проблемами аудитории" },
  { id: "jtbd_analysis", name: "JTBD", category: "analysis", description: "Анализ Jobs to be Done - задач пользователей" },
  { id: "content_themes", name: "Темы для контента", category: "analysis", description: "Контентная стратегия для аудитории" },
  { id: "user_personas", name: "User personas (5 шт)", category: "analysis", description: "Детализированные персоны пользователей" },
  { id: "niche_integration", name: "Уровни интеграции с нишей", category: "analysis", description: "Анализ интеграции с нишей" },
  
  // Финальный отчет (доступен только после всех анализов)
  { id: "final_report", name: "Аналитический отчет", category: "final", description: "Комплексный аналитический отчет по всем исследованиям" }
];

const CATEGORY_ICONS = {
  segment: Target,
  analysis: Brain,
  final: FileText
};

const CATEGORY_NAMES = {
  segment: "Сегмент",
  analysis: "Анализ аудитории",
  final: "Финальный отчет"
};

export default function SegmentAnalysisMenu({ researchId, segmentId, onAnalysisStart, onViewResult }: SegmentAnalysisMenuProps) {
  const { toast } = useCustomToast();
  const { user } = useAuth();
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["segment_description"]);
  const [completedAnalyses, setCompletedAnalyses] = useState<string[]>(() => {
    // Инициализация из localStorage для мгновенного отображения
    const storageKey = `segment-analysis-${researchId}-${segmentId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.completed || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [analyzingTypes, setAnalyzingTypes] = useState<string[]>(() => {
    // Проверяем анализирующиеся типы из localStorage
    const analyzing: string[] = [];
    ANALYSIS_OPTIONS.forEach(option => {
      const key = `analyzing-${researchId}-${segmentId}-${option.id}`;
      if (localStorage.getItem(key)) {
        analyzing.push(option.id);
      }
    });
    return analyzing;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [deletingAnalysis, setDeletingAnalysis] = useState<string | null>(null);

  // Get localStorage key for analysis status
  const getAnalysisKey = (analysisType: string) => `analyzing-${researchId}-${segmentId}-${analysisType}`;

  // Check localStorage for currently analyzing types
  const loadAnalyzingTypes = () => {
    const analyzing: string[] = [];
    const now = Date.now();
    const TIMEOUT = 30 * 60 * 1000; // 30 минут таймаут
    
    ANALYSIS_OPTIONS.forEach(option => {
      const key = getAnalysisKey(option.id);
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const startedAt = new Date(parsed.startedAt).getTime();
          
          // Если анализ идет больше 30 минут - считаем его зависшим
          if (now - startedAt > TIMEOUT) {
            localStorage.removeItem(key);
          } else {
            analyzing.push(option.id);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });
    setAnalyzingTypes(analyzing);
  };

  // Единая функция для загрузки всех данных
  const loadAllAnalysisData = async () => {
    try {
      // Сначала загружаем из localStorage для быстрого отображения
      const storageKey = `segment-analysis-${researchId}-${segmentId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.completed && data.completed.length > 0) {
            setCompletedAnalyses(data.completed);
          }
        } catch (e) {
          console.error('Error parsing localStorage data:', e);
        }
      }
      
      // Затем загружаем актуальные данные из Supabase в фоне
      console.log('Loading analysis data for:', { researchId, segmentId, userId: user?.id });
      
      // Загружаем завершенные анализы из Supabase
      const { data: supabaseAnalyses, error } = await getCompletedAnalyses(researchId, parseInt(segmentId));
      
      if (!error && supabaseAnalyses) {
        const completedFromSupabase = supabaseAnalyses.map((analysis: any) => analysis.analysis_type);
        setCompletedAnalyses(completedFromSupabase);
        
        // Сохраняем в localStorage для быстрой загрузки при следующем входе
        const storageKey = `segment-analysis-${researchId}-${segmentId}`;
        localStorage.setItem(storageKey, JSON.stringify({
          completed: completedFromSupabase,
          updatedAt: new Date().toISOString()
        }));
        console.log('Loaded completed analyses:', completedFromSupabase);
        
        // Очищаем статус "анализируется" для завершенных анализов
        completedFromSupabase.forEach(analysisType => {
          const key = getAnalysisKey(analysisType);
          const data = localStorage.getItem(key);
          if (data) {
            localStorage.removeItem(key);
            // Убираем из списка анализирующихся
            setAnalyzingTypes(prev => prev.filter(type => type !== analysisType));
          }
        });
      }

      // Загружаем статус анализирующихся типов из localStorage
      loadAnalyzingTypes();
    } catch (error) {
      console.error('Error loading analysis data:', error);
    }
  };

  // Инициализация данных при монтировании компонента
  useEffect(() => {
    if (user?.id) {
      loadAllAnalysisData();
    }
  }, [researchId, segmentId, user?.id]);

  // Подписка на real-time обновления segment_analyses
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('segment-analyses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'segment_analyses',
          filter: `"Project ID"=eq.${researchId} AND "Сегмент ID"=eq.${segmentId}`
        },
        (payload) => {
          console.log('Real-time segment analysis update:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New record:', payload.new);
          console.log('Old record:', payload.old);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log('Triggering data reload due to analysis completion');
            
            // Извлекаем тип анализа из полученных данных
            const completedAnalysisType = payload.new?.analysis_type;
            
            if (completedAnalysisType) {
              // Убираем из анализирующихся СРАЗУ
              const analysisKey = getAnalysisKey(completedAnalysisType);
              localStorage.removeItem(analysisKey);
              setAnalyzingTypes(prev => prev.filter(type => type !== completedAnalysisType));
              
              // Добавляем в завершенные СРАЗУ
              setCompletedAnalyses(prev => {
                if (!prev.includes(completedAnalysisType)) {
                  return [...prev, completedAnalysisType];
                }
                return prev;
              });
            }
            
            // Перезагружаем все данные для синхронизации
            loadAllAnalysisData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [researchId, segmentId, user?.id]);

  // Периодическая проверка для синхронизации статусов
  useEffect(() => {
    if (analyzingTypes.length === 0) return;
    
    const interval = setInterval(() => {
      loadAllAnalysisData();
    }, 5000); // Проверка каждые 5 секунд
    
    return () => clearInterval(interval);
  }, [analyzingTypes.length]);

  // Убрана периодическая проверка - теперь анализ синхронный

  const handleOptionToggle = (optionId: string) => {
    const option = ANALYSIS_OPTIONS.find(opt => opt.id === optionId);
    if (!option || option.required || completedAnalyses.includes(optionId)) return;

    // Проверяем, завершен ли анализ описания сегмента
    const segmentDescriptionCompleted = completedAnalyses.includes("segment_description");
    
    // Блокируем все остальные опции до завершения описания сегмента
    if (!segmentDescriptionCompleted && option.id !== "segment_description") return;

    // Проверяем зависимости для специфических разделов
    if (option.id === "solutions_analysis" && !completedAnalyses.includes("problems_analysis")) return;
    
    if (option.id === "content_themes") {
      const requiredForContent = ["segment_description", "bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas"];
      if (!requiredForContent.every(id => completedAnalyses.includes(id))) return;
    }
    
    if (option.id === "niche_integration") {
      const allAnalysisOptions = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "content_themes", "user_personas"];
      if (!allAnalysisOptions.every(id => completedAnalyses.includes(id))) return;
    }

    // Для финального отчета проверяем, что все остальные анализы завершены
    if (option.id === "final_report") {
      const allAnalysisOptions = ANALYSIS_OPTIONS.filter(opt => opt.category === "analysis");
      const allAnalysisCompleted = allAnalysisOptions.every(opt => completedAnalyses.includes(opt.id));
      if (!allAnalysisCompleted) return;
    }

    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleStartAnalysis = async () => {
    if (selectedOptions.length === 0) return;

    // Фильтруем только те анализы, которые еще не выполняются и не завершены
    const optionsToAnalyze = selectedOptions.filter(
      optionId => !analyzingTypes.includes(optionId) && !completedAnalyses.includes(optionId)
    );

    if (optionsToAnalyze.length === 0) {
      toast({
        type: "error",
        title: "Нет доступных анализов",
        description: "Все выбранные анализы уже выполнены или выполняются"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Получаем данные сегмента из Supabase ОДИН РАЗ для всех анализов
      const { data: segmentData, error: segmentError } = await supabase
        .from('segments')
        .select('*')
        .eq('Project ID', researchId)
        .eq('Сегмент ID', parseInt(segmentId))
        .single();

      if (segmentError) {
        console.error('Error loading segment data:', segmentError);
        toast({
          type: "warning",
          title: "Предупреждение",
          description: "Использованы данные по умолчанию для сегмента"
        });
      }

      const segmentTitle = segmentData?.["Название сегмента"] || `Сегмент ${segmentId}`;
      const segmentDescription = segmentData?.description || 'Описание недоступно';
      
      // Показываем тост о начале анализов
      const analysisNames = optionsToAnalyze.map(id => 
        ANALYSIS_OPTIONS.find(opt => opt.id === id)?.name || id
      ).join(", ");
      
      toast({
        type: "info",
        title: optionsToAnalyze.length === 1 ? "Анализ запущен" : "Анализы запущены",
        description: optionsToAnalyze.length === 1 
          ? `Выполняется: ${analysisNames}`
          : `Параллельная обработка: ${analysisNames}`,
        duration: 5000
      });

      // Сохраняем статус всех анализов в localStorage
      optionsToAnalyze.forEach(analysisType => {
        const analysisKey = getAnalysisKey(analysisType);
        localStorage.setItem(analysisKey, JSON.stringify({
          status: 'processing',
          startedAt: new Date().toISOString(),
          analysisType: analysisType
        }));
      });

      // Добавляем все в список анализирующихся
      setAnalyzingTypes(prev => [...prev, ...optionsToAnalyze]);

      // ПАРАЛЛЕЛЬНЫЙ ЗАПУСК всех анализов
      const analysisPromises = optionsToAnalyze.map(async (analysisType) => {
        const selectedAnalysisName = ANALYSIS_OPTIONS.find(opt => opt.id === analysisType)?.name || analysisType;
        
        try {
          console.log(`Начинаем анализ: ${selectedAnalysisName}`);
          
          // Вызываем OpenAI Assistant для каждого типа анализа
          const result = await analyzeSegment({
            researchId,
            segmentId: parseInt(segmentId),
            segmentName: segmentTitle,
            segmentDescription: segmentDescription,
            analysisType: analysisType
          });
          
          // Сохраняем результат в Supabase
          const { error: saveError } = await saveSegmentAnalysis(
            researchId,
            parseInt(segmentId),
            segmentTitle,
            analysisType,
            {
              text: result.text,
              analysis_result: result.text,
              timestamp: new Date().toISOString()
            }
          );
          
          if (saveError) {
            console.error(`Error saving analysis ${analysisType}:`, saveError);
            throw new Error(`Не удалось сохранить результат анализа "${selectedAnalysisName}"`);
          }
          
          // Убираем из анализирующихся этот конкретный анализ
          const analysisKey = getAnalysisKey(analysisType);
          localStorage.removeItem(analysisKey);
          setAnalyzingTypes(prev => prev.filter(type => type !== analysisType));
          
          // Добавляем в завершенные
          setCompletedAnalyses(prev => {
            if (!prev.includes(analysisType)) {
              const updated = [...prev, analysisType];
              
              // Обновляем localStorage кеш
              const storageKey = `segment-analysis-${researchId}-${segmentId}`;
              localStorage.setItem(storageKey, JSON.stringify({
                completed: updated,
                updatedAt: new Date().toISOString()
              }));
              
              return updated;
            }
            return prev;
          });
          
          // Показываем уведомление о завершении конкретного анализа
          toast({
            type: "success",
            title: "Анализ завершен",
            description: `${selectedAnalysisName} успешно выполнен`,
            duration: 3000
          });
          
          return { success: true, analysisType, name: selectedAnalysisName };
          
        } catch (error) {
          console.error(`Ошибка анализа ${analysisType}:`, error);
          
          // Убираем статус анализа при ошибке
          const analysisKey = getAnalysisKey(analysisType);
          localStorage.removeItem(analysisKey);
          setAnalyzingTypes(prev => prev.filter(type => type !== analysisType));
          
          // Показываем уведомление об ошибке конкретного анализа
        toast({
          type: "error",
          title: "Ошибка анализа",
          description: `Не удалось выполнить "${selectedAnalysisName}"`,
          duration: 5000
        });
          
          return { success: false, analysisType, name: selectedAnalysisName, error };
        }
      });

      // Ждем завершения ВСЕХ анализов
      const results = await Promise.allSettled(analysisPromises);
      
      // Подсчитываем результаты
      const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)).length;
      
      // Перезагружаем данные для обновления UI
      await loadAllAnalysisData();
      
      // Итоговое уведомление
      if (successful > 0 && failed === 0) {
        const analysisWord = getAnalysisWord(successful);
        const verbForm = getVerbForm(successful);
        
        toast({
          type: "success",
          title: successful === 1 
            ? "Анализ успешно завершен" 
            : `Все ${successful} ${analysisWord} успешно ${verbForm}`,
          description: "Данные сохранены и готовы к просмотру",
          duration: 5000
        });
      } else if (successful > 0 && failed > 0) {
        const successWord = getAnalysisWord(successful);
        const failedWord = getAnalysisWord(failed);
        
        toast({
          type: "warning",
          title: "Анализы завершены с предупреждениями",
          description: `Успешно: ${successful} ${successWord}, С ошибками: ${failed} ${failedWord}`,
          duration: 5000
        });
      } else if (failed > 0 && successful === 0) {
        const analysisWord = getAnalysisWord(failed);
        
        toast({
          type: "error",
          title: failed === 1 
            ? "Анализ не выполнен"
            : "Анализы не выполнены",
          description: failed === 1 
            ? "Не удалось выполнить анализ"
            : `Не удалось выполнить ${failed} ${analysisWord}`,
          duration: 5000
        });
      }

      // Очищаем выбранные (кроме обязательных)
      setSelectedOptions(["segment_description"]);
      onAnalysisStart?.(optionsToAnalyze);
      
    } catch (error) {
      console.error("Критическая ошибка запуска анализов:", error);
      toast({
        type: "error",
        title: "Критическая ошибка",
        description: error instanceof Error ? error.message : "Произошла неизвестная ошибка"
      });
      
      // Очищаем все статусы анализов при критической ошибке
      optionsToAnalyze.forEach(analysisType => {
        const analysisKey = getAnalysisKey(analysisType);
        localStorage.removeItem(analysisKey);
      });
      setAnalyzingTypes(prev => prev.filter(type => !optionsToAnalyze.includes(type)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisType: string) => {
    setDeletingAnalysis(analysisType);
    
    try {
      // Удаляем из Supabase
      const { error } = await deleteSegmentAnalysis(researchId, parseInt(segmentId), analysisType);
      
      if (error) {
        console.error('Error deleting analysis from Supabase:', error);
        toast({
          type: "error",
          title: "Ошибка",
          description: "Не удалось удалить анализ из базы данных"
        });
        return;
      }

      // Удаляем из localStorage
      const resultKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
      localStorage.removeItem(resultKey);

      // Обновляем список завершенных анализов
      const storageKey = `segment-analysis-${researchId}-${segmentId}`;
      const saved = localStorage.getItem(storageKey);
      const data = saved ? JSON.parse(saved) : { completed: [] };
      
      const updatedCompleted = (data.completed || []).filter((id: string) => id !== analysisType);
      const updatedData = { ...data, completed: updatedCompleted };
      localStorage.setItem(storageKey, JSON.stringify(updatedData));

      // Обновляем состояние
      setCompletedAnalyses(prev => prev.filter(id => id !== analysisType));

      const analysisName = ANALYSIS_OPTIONS.find(opt => opt.id === analysisType)?.name || analysisType;
      toast({
        type: "delete",
        title: "Анализ удален",
        description: `Анализ "${analysisName}" успешно удален и снова доступен для выполнения.`
      });

    } catch (error) {
      console.error("Ошибка удаления анализа:", error);
      toast({
        type: "error",
        title: "Ошибка",
        description: "Произошла ошибка при удалении анализа"
      });
    } finally {
      setDeletingAnalysis(null);
    }
  };

  const canDeleteAnalysis = (analysisType: string) => {
    // Нельзя удалить "Описание сегмента" если есть другие завершенные анализы
    if (analysisType === "segment_description") {
      const otherCompleted = completedAnalyses.filter(id => id !== "segment_description");
      return otherCompleted.length === 0;
    }
    return true;
  };

  // Функция для получения сообщения о требуемых анализах для разблокировки
  const getUnlockMessage = (optionId: string) => {
    const getAnalysisNameById = (id: string) => {
      return ANALYSIS_OPTIONS.find(opt => opt.id === id)?.name || id;
    };

    if (optionId === "solutions_analysis") {
      const required = ["problems_analysis"];
      const missing = required.filter(id => !completedAnalyses.includes(id));
      if (missing.length > 0) {
        return `Чтобы открыть раздел завершите анализ: ${missing.map(getAnalysisNameById).join(", ")}`;
      }
    }

    if (optionId === "content_themes") {
      const required = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas"];
      const missing = required.filter(id => !completedAnalyses.includes(id));
      if (missing.length > 0) {
        return `Чтобы открыть раздел завершите анализы: ${missing.map(getAnalysisNameById).join(", ")}`;
      }
    }

    if (optionId === "niche_integration") {
      const required = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas", "content_themes"];
      const missing = required.filter(id => !completedAnalyses.includes(id));
      if (missing.length > 0) {
        return `Чтобы открыть раздел завершите анализы: ${missing.map(getAnalysisNameById).join(", ")}`;
      }
    }

    if (optionId === "final_report") {
      const allAnalysisOptions = ANALYSIS_OPTIONS.filter(opt => opt.category === "analysis");
      const missing = allAnalysisOptions.filter(opt => !completedAnalyses.includes(opt.id));
      if (missing.length > 0) {
        return `Чтобы открыть раздел завершите анализы: ${missing.map(opt => opt.name).join(", ")}`;
      }
    }

    if (!completedAnalyses.includes("segment_description")) {
      return "Чтобы открыть раздел завершите анализ: Описание сегмента";
    }

    return null;
  };


  const getOptionStatus = (optionId: string) => {
    // Check if analysis is currently processing
    if (analyzingTypes.includes(optionId)) {
      return "processing";
    }
    
    if (completedAnalyses.includes(optionId)) {
      return "completed";
    }
    
    if (selectedOptions.includes(optionId)) {
      return "selected";
    }
    
    return "available";
  };

  const groupedOptions = ANALYSIS_OPTIONS.reduce((acc, option) => {
    if (!acc[option.category]) acc[option.category] = [];
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, AnalysisOption[]>);

  const selectedCount = selectedOptions.filter(id => !completedAnalyses.includes(id)).length;
  const segmentDescriptionCompleted = completedAnalyses.includes("segment_description");

  return (
    <TooltipProvider delayDuration={0}>
      <Card className="w-full mx-auto max-w-none overflow-hidden">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 overflow-hidden">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
            <Brain className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Параметры анализа</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            {/* Кнопка начать анализ */}
            <Button 
              onClick={handleStartAnalysis}
              disabled={selectedCount === 0 || isLoading}
              size="sm"
              className="flex items-center gap-2 min-w-0 shrink-0"
            >
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">
                    {selectedCount === 1 ? "Анализируем..." : "Запускаем анализы..."}
                  </span>
                  <span className="sm:hidden">Анализ...</span>
                </>
              ) : analyzingTypes.length > 0 ? (
                <>
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span className="hidden sm:inline">
                    Выполняется: {analyzingTypes.length} {getAnalysisWord(analyzingTypes.length)}
                  </span>
                  <span className="sm:hidden">Идет анализ</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {selectedCount === 1 
                      ? "Начать анализ"
                      : selectedCount > 1
                      ? `Начать анализ (${selectedCount})`
                      : "Начать анализ"
                    }
                  </span>
                  <span className="sm:hidden">
                    {selectedCount > 1 ? `Начать (${selectedCount})` : "Начать"}
                  </span>
                </>
              )}
            </Button>

            {/* Кнопка выделить все с лампочкой в углу */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Получаем только доступные опции с учетом всех ограничений
                  const availableOptions = ANALYSIS_OPTIONS.filter(option => {
                    // Пропускаем уже завершенные и анализирующиеся
                    if (completedAnalyses.includes(option.id) || analyzingTypes.includes(option.id)) {
                      return false;
                    }
                    
                    // Обязательная опция всегда доступна
                    if (option.required) {
                      return true;
                    }
                    
                    // Проверяем базовое условие - описание сегмента должно быть завершено
                    if (!segmentDescriptionCompleted && option.id !== "segment_description") {
                      return false;
                    }
                    
                    // Проверяем зависимости для специфических разделов
                    if (option.id === "solutions_analysis" && !completedAnalyses.includes("problems_analysis")) {
                      return false;
                    }
                    
                    if (option.id === "content_themes") {
                      const requiredForContent = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas"];
                      return requiredForContent.every(id => completedAnalyses.includes(id));
                    }
                    
                    if (option.id === "niche_integration") {
                      const allAnalysisOptions = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "content_themes", "user_personas"];
                      return allAnalysisOptions.every(id => completedAnalyses.includes(id));
                    }
                    
                    if (option.id === "final_report") {
                      const allAnalysisOptions = ANALYSIS_OPTIONS.filter(opt => opt.category === "analysis");
                      return allAnalysisOptions.every(opt => completedAnalyses.includes(opt.id));
                    }
                    
                    return true;
                  });
                  
                  const availableIds = availableOptions.map(opt => opt.id);
                  const allAvailableSelected = availableIds.every(id => selectedOptions.includes(id));
                  
                  if (allAvailableSelected) {
                    // Если все доступные уже выделены, снимаем выделение с них
                    setSelectedOptions(prev => prev.filter(id => !availableIds.includes(id)));
                  } else {
                    // Если не все выделены, выделяем все доступные
                    const newSelected = [...new Set([...selectedOptions, ...availableIds])];
                    setSelectedOptions(newSelected);
                  }
                }}
                className="text-xs shrink-0"
              >
                <CheckCheck className={`h-3 w-3 mr-1 ${(() => {
                  const availableOptions = ANALYSIS_OPTIONS.filter(option => {
                    if (completedAnalyses.includes(option.id) || analyzingTypes.includes(option.id)) {
                      return false;
                    }
                    if (option.required) {
                      return true;
                    }
                    if (!segmentDescriptionCompleted && option.id !== "segment_description") {
                      return false;
                    }
                    if (option.id === "solutions_analysis" && !completedAnalyses.includes("problems_analysis")) {
                      return false;
                    }
                    if (option.id === "content_themes") {
                      const requiredForContent = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas"];
                      return requiredForContent.every(id => completedAnalyses.includes(id));
                    }
                    if (option.id === "niche_integration") {
                      const allAnalysisOptions = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "content_themes", "user_personas"];
                      return allAnalysisOptions.every(id => completedAnalyses.includes(id));
                    }
                    if (option.id === "final_report") {
                      const allAnalysisOptions = ANALYSIS_OPTIONS.filter(opt => opt.category === "analysis");
                      return allAnalysisOptions.every(opt => completedAnalyses.includes(opt.id));
                    }
                    return true;
                  });
                  const availableIds = availableOptions.map(opt => opt.id);
                  const allAvailableSelected = availableIds.every(id => selectedOptions.includes(id)) && availableIds.length > 0;
                  return allAvailableSelected ? "text-green-600" : "";
                })()}`}
                />
                Все
              </Button>
              
              {/* Лампочка в углу кнопки */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center cursor-help">
                    <Lightbulb className="h-3 w-3 text-yellow-800" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Выделите все доступные анализы для параллельного запуска. Это позволит получить результаты всех исследований одновременно и сэкономить время.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>{completedAnalyses.length}</span>
              <span className="hidden sm:inline ml-1">завершено</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 px-4 sm:px-6">
        {/* Завершенные анализы как кнопки, сгруппированные по категориям */}
        {completedAnalyses.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Готовые результаты анализа
            </h4>
            
            {/* Информационное сообщение */}
            <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 mt-3 mb-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse"></div>
              <div className="relative flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Готовые анализы
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Нажмите на любой анализ, чтобы просмотреть детальные результаты и получить инсайты
                  </p>
                </div>
              </div>
            </div>
            
            {Object.entries(groupedOptions).map(([category, options]) => {
              const completedInCategory = options.filter(option => completedAnalyses.includes(option.id));
              if (completedInCategory.length === 0) return null;
              
              const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
              const categoryName = CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES];
              
              return (
                <div key={`completed-${category}`} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <IconComponent className="h-4 w-4" />
                    {categoryName}
                  </div>
                  <div className="grid gap-2 pl-1 sm:pl-2 md:pl-6 overflow-hidden">
                    {completedInCategory.map((option) => (
                       <div key={option.id} className="relative">
                            <Button
                              variant="outline"
                              className="justify-start h-auto p-2 sm:p-3 text-left w-full hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group cursor-pointer min-w-0 max-w-full"
                              onClick={() => onViewResult?.(option.id)}
                           >
                              <div className="flex items-start gap-2 sm:gap-3 w-full min-w-0 max-w-full overflow-hidden">
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                                  <div className="font-medium group-hover:text-primary transition-colors text-sm break-words">
                                    {option.name}
                                  </div>
                                  {option.description && (
                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-3 sm:line-clamp-2 break-words overflow-hidden">
                                      {option.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                          </Button>
                         
                         {canDeleteAnalysis(option.id) && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                 disabled={deletingAnalysis === option.id}
                               >
                                 {deletingAnalysis === option.id ? (
                                   <Clock className="h-3 w-3 animate-spin" />
                                 ) : (
                                   <Trash2 className="h-3 w-3" />
                                 )}
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Удалить анализ?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Вы действительно хотите удалить анализ "{option.name}"? 
                                   Это действие нельзя отменить. Данные будут удалены из базы данных 
                                   и локального хранилища, а анализ снова станет доступным для выполнения.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Отмена</AlertDialogCancel>
                                 <AlertDialogAction 
                                   onClick={() => handleDeleteAnalysis(option.id)}
                                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                 >
                                   Удалить
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         )}
                       </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <Separator />
          </div>
        )}

        {!segmentDescriptionCompleted && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Сначала выполните анализ описания сегмента</p>
              <p className="text-xs opacity-80">После этого откроются дополнительные возможности анализа</p>
            </div>
          </div>
        )}
        
        {/* Заголовок для доступных анализов */}
        {(() => {
          // Проверяем, есть ли доступные для выбора анализы
          const hasAvailableAnalyses = Object.values(groupedOptions).some(options => 
            options.some(option => !completedAnalyses.includes(option.id))
          );
          
          return hasAvailableAnalyses && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-600" />
                Доступные анализы
              </h4>
              
              {/* Информационное сообщение для доступных анализов */}
              <div className="relative bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-3 mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent animate-pulse"></div>
                <div className="relative flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Выберите анализы для запуска
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Отметьте нужные анализы и нажмите "Начать анализ"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        
        <ScrollArea className="h-96 md:h-96 max-h-[70vh] overflow-x-hidden">
          <div className="space-y-6 pr-2 sm:pr-4 overflow-hidden">
            {Object.entries(groupedOptions).map(([category, options]) => {
              const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
              const categoryName = CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES];
              
              // Фильтруем незавершенные опции для текущей категории
              const availableOptions = options.filter(option => !completedAnalyses.includes(option.id));
              
              // Если нет доступных опций в категории, не показываем ее
              if (availableOptions.length === 0) return null;
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">{categoryName}</h4>
                  </div>
                  
                   <div className="grid gap-2 pl-1 sm:pl-2 md:pl-6 overflow-hidden">
                     {availableOptions.map((option) => {
                       const status = getOptionStatus(option.id);
                      const isDisabled = option.required || status === "completed";
                      
                      // Блокировка до завершения описания сегмента
                      const isLockedUntilSegment = !segmentDescriptionCompleted && option.id !== "segment_description";
                      
                      // Проверяем зависимости для специфических разделов
                      let isLockedByDependency = false;
                      
                      if (option.id === "solutions_analysis") {
                        isLockedByDependency = !completedAnalyses.includes("problems_analysis");
                       } else if (option.id === "content_themes") {
                         const requiredForContent = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas"];
                         isLockedByDependency = !requiredForContent.every(id => completedAnalyses.includes(id));
                      } else if (option.id === "niche_integration") {
                        const allAnalysisOptions = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "content_themes", "user_personas"];
                        isLockedByDependency = !allAnalysisOptions.every(id => completedAnalyses.includes(id));
                      }
                      
                      // Для финального отчета проверяем доступность
                      const isFinalReport = option.id === "final_report";
                      const allAnalysisOptions = ANALYSIS_OPTIONS.filter(opt => opt.category === "analysis");
                      const allAnalysisCompleted = allAnalysisOptions.every(opt => completedAnalyses.includes(opt.id));
                      const finalReportAvailable = isFinalReport && allAnalysisCompleted && !completedAnalyses.includes(option.id);
                      
                      // Блокируем финальный отчет если не все анализы завершены
                      const finalReportDisabled = isFinalReport && !allAnalysisCompleted;
                      
                      return (
                         <div 
                           key={option.id} 
                           className={`relative flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg border transition-colors min-w-0 max-w-full overflow-hidden ${
                             finalReportAvailable 
                               ? "border-primary bg-primary/5 hover:bg-primary/10" 
                               : "hover:bg-muted/50"
                           } ${(finalReportDisabled || isLockedUntilSegment || isLockedByDependency) ? "opacity-50" : ""}`}
                         >
                           {/* Замочек для заблокированных опций с tooltip */}
                           {(isLockedUntilSegment || isLockedByDependency || finalReportDisabled) && (
                             <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 rounded-lg backdrop-blur-sm">
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <div className="cursor-help p-2">
                                     <Lock className="h-5 w-5 text-muted-foreground" />
                                   </div>
                                 </TooltipTrigger>
                                 <TooltipContent 
                                   side="right"
                                   align="end"
                                   sideOffset={15}
                                   className="z-50 !bg-white dark:!bg-gray-900 border border-gray-400 dark:border-gray-500 shadow-2xl max-w-xs p-4 !opacity-100"
                                 >
                                 <div className="space-y-2">
                                   <div className="flex items-center gap-2">
                                     <Lock className="h-4 w-4 text-amber-600" />
                                     <p className="font-bold text-sm text-black dark:text-white">
                                       Раздел заблокирован
                                     </p>
                                   </div>
                                   <p className="text-sm text-black dark:text-white leading-relaxed font-medium">
                                     {getUnlockMessage(option.id) || "Раздел заблокирован"}
                                   </p>
                                 </div>
                               </TooltipContent>
                               </Tooltip>
                             </div>
                           )}
                            <Checkbox
                              id={option.id}
                              checked={selectedOptions.includes(option.id) || completedAnalyses.includes(option.id)}
                              onCheckedChange={() => handleOptionToggle(option.id)}
                              disabled={isDisabled || finalReportDisabled || isLockedUntilSegment || isLockedByDependency || status === "processing"}
                              className="mt-0.5"
                            />
                          
                           <div className="flex-1 space-y-1 min-w-0 max-w-full overflow-hidden">
                             <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0">
                               <label 
                                 htmlFor={option.id}
                                 className={`text-sm font-medium cursor-pointer break-words leading-tight ${isDisabled ? 'text-muted-foreground' : ''}`}
                               >
                                 {option.name}
                               </label>
                              
                              {status === "completed" && (
                                <Badge variant="default" className="h-5 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Готово
                                </Badge>
                              )}
                              
                               {status === "processing" && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="h-6 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-300 flex items-center gap-1 px-2">
                                      <div className="relative">
                                        <Spinner size="sm" className="h-3 w-3" />
                                      </div>
                                      <span className="font-medium hidden sm:inline">Анализирую</span>
                                      <div className="flex gap-0.5 ml-1">
                                        <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                      </div>
                                    </Badge>
                                  </div>
                                )}
                               
                               {option.required && (
                                 <Badge variant="secondary" className="h-5 text-xs">
                                   Обязательно
                                 </Badge>
                               )}
                            </div>
                            
                             {option.description && (
                               <p className="text-xs text-muted-foreground line-clamp-3 sm:line-clamp-2 break-words overflow-hidden max-w-full leading-relaxed">
                                 {option.description}
                               </p>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}