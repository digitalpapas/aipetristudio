import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Check, Target, MessageSquare, Users, RefreshCw, Info, Eye, Crown, Sparkles } from "lucide-react";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { useAuth } from "@/contexts/AuthContext";
import { markSelectedSegments, addSegmentToSelected, removeSegmentFromSelected } from "@/lib/supabase-utils";
import { supabase } from "@/integrations/supabase/client";
import { parseSegments } from "@/lib/segment-parser";

interface Segment {
  id: number;
  title: string;
  description: string;
  fullDescription?: string; // Добавляем поле для полного описания от первого агента
  problems?: string;
  message?: string;
}

interface TopSegmentData {
  segment_id: number;
  rank: number;
  title: string;
  description: string;
  reasoning?: string;
  full_analysis?: string; // Добавляем поле для полного анализа от второго агента
}

interface SegmentCardsProps {
  segments: Segment[];
  topSegments?: number[] | TopSegmentData[]; // Может быть либо массив ID, либо массив объектов
  topSegmentsData?: any[]; // Enhanced data from second agent
  selectedSegments?: number[]; // ID выбранных сегментов для отображения
  onSelectedSegmentsChange?: (segments: number[]) => void;
  researchTitle?: string;
  researchId?: string;
  originalData?: {
    projectName: string;
    description: string;
    userId: string;
    projectId: string;
  };
  onRegenerate?: (newSegments: Segment[], newTopSegments: number[]) => void;
  hideTopRecommendations?: boolean; // Новый пропс для скрытия блока топ-3
}

export default function SegmentCards({ 
  segments, 
  topSegments, 
  topSegmentsData,
  selectedSegments: initialSelectedSegments = [],
  onSelectedSegmentsChange, 
  researchTitle, 
  researchId, 
  originalData, 
  onRegenerate,
  hideTopRecommendations = false
}: SegmentCardsProps) {
  const navigate = useNavigate();
  const { toast } = useCustomToast();
  const { user } = useAuth();
  const [selectedSegments, setSelectedSegments] = useState<number[]>(initialSelectedSegments);
  
  // Обновляем selectedSegments при изменении initialSelectedSegments с проверкой на равенство
  useEffect(() => {
    // Проверяем, действительно ли массивы различаются
    const arraysEqual = selectedSegments.length === initialSelectedSegments.length &&
      selectedSegments.every(id => initialSelectedSegments.includes(id)) &&
      initialSelectedSegments.every(id => selectedSegments.includes(id));
    
    if (!arraysEqual) {
      setSelectedSegments(initialSelectedSegments);
    }
  }, [initialSelectedSegments]); // FIXED: Removed selectedSegments to prevent infinite loop
  const [showCommentField, setShowCommentField] = useState(false);
  const [regenerateComment, setRegenerateComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSegmentForView, setSelectedSegmentForView] = useState<Segment | null>(null);
  const [dbTopSegments, setDbTopSegments] = useState<TopSegmentData[]>([]);
  const [fullSegmentData, setFullSegmentData] = useState<Record<number, any>>({});
  const hasLoadedData = useRef(false);

  // Load enhanced top segments AND full segment data from database
  useEffect(() => {
    // Проверяем ref вместо state
    if (hasLoadedData.current) return;
    
    const projectId = researchId || originalData?.projectId;
    if (!projectId) {
      // Проект не найден, выходим без лога
      return;
    }
    
    // Устанавливаем флаг в ref
    hasLoadedData.current = true;
    
    const fetchSegmentData = async () => {
      try {
        // Загружаем сегменты
        const { data: segmentData } = await supabase
          .from('segments')
          .select('*')
          .eq('Project ID', projectId);
          
        if (segmentData) {
          const dataMap: Record<number, any> = {};
          segmentData.forEach(seg => {
            dataMap[seg['Сегмент ID']] = {
              id: seg['Сегмент ID'],
              title: seg['Название сегмента'],
              description: seg.description,
              problems: seg.problems,
              message: seg.message
            };
          });
          setFullSegmentData(dataMap);
        }
        
        // Загружаем топ-сегменты
        const { data: topData } = await supabase
          .from('top_segments')
          .select('*')
          .eq('project_id', projectId)
          .order('rank');
          
        if (topData && topData.length > 0) {
          setDbTopSegments(topData);
          // Лог удален для предотвращения спама
        }
      } catch (error) {
        console.error('Error loading data:', error);
        hasLoadedData.current = false; // Сбрасываем при ошибке
      }
    };
    
    fetchSegmentData();
  }, [researchId, originalData?.projectId]); // Чистые зависимости

  // Get the final top segment IDs (всегда возвращаем числа) - мемоизированное значение
  const finalTopSegmentIds = useMemo(() => {
    if (dbTopSegments.length > 0) {
      return dbTopSegments.map(t => t.segment_id);
    }
    // Если topSegments переданы как числа, используем их
    if (topSegments && Array.isArray(topSegments) && typeof topSegments[0] === 'number') {
      return topSegments as number[];
    }
    // Если topSegments переданы как объекты, извлекаем segment_id
    if (topSegments && Array.isArray(topSegments) && typeof topSegments[0] === 'object') {
      return (topSegments as TopSegmentData[]).map(t => t.segment_id);
    }
    return [];
  }, [dbTopSegments, topSegments]);

  // Фильтруем сегменты: в разделе "Сегменты" показываем только НЕ выбранные
  const filteredSegments = useMemo(() => {
    if (hideTopRecommendations) {
      // В разделе результатов показываем все сегменты, исключая уже выбранные
      return segments.filter(segment => !selectedSegments.includes(segment.id));
    }
    return segments;
  }, [segments, selectedSegments, hideTopRecommendations]);

  // Мемоизируем функции для предотвращения бесконечного рендеринга
  const getFullSegmentDescription = useCallback((segmentId: number) => {
    const segData = fullSegmentData[segmentId];
    return segData?.description || segments.find(s => s.id === segmentId)?.description || '';
  }, [fullSegmentData, segments]);

  // Get enhanced description for a segment if it's in top 3
  const getEnhancedDescription = useCallback((segmentId: number) => {
    const topSegment = dbTopSegments.find(t => t.segment_id === segmentId);
    return topSegment?.description || topSegment?.full_analysis;
  }, [dbTopSegments]);

  const getReasoning = useCallback((segmentId: number) => {
    const topSegment = dbTopSegments.find(t => t.segment_id === segmentId);
    return topSegment?.reasoning;
  }, [dbTopSegments]);

  const getTopRank = useCallback((segmentId: number) => {
    const topSegment = dbTopSegments.find(t => t.segment_id === segmentId);
    return topSegment?.rank;
  }, [dbTopSegments]);

  // Мемоизируем контент модального окна - ИСПРАВЛЕННОЕ определение топ-сегментов
  const modalContent = useMemo(() => {
    if (!selectedSegmentForView) return null;
    
    const segmentData = fullSegmentData[selectedSegmentForView.id];
    const isTopSegment = finalTopSegmentIds.includes(selectedSegmentForView.id);
    const topSegmentData = dbTopSegments.find(t => t.segment_id === selectedSegmentForView.id);
    
    return {
      description: segmentData?.description || selectedSegmentForView.description,
      problems: segmentData?.problems || (selectedSegmentForView as any)?.problems,
      message: segmentData?.message || (selectedSegmentForView as any)?.message,
      reasoning: topSegmentData?.reasoning || topSegmentData?.full_analysis, // Проверяем оба поля!
      enhancedDescription: topSegmentData?.description,
      isTopSegment: isTopSegment // Важно - правильное определение!
    };
  }, [selectedSegmentForView, fullSegmentData, finalTopSegmentIds, dbTopSegments]);

  const toggleSegment = (segmentId: number) => {
    console.log('⚡ toggleSegment called with segmentId:', segmentId);
    console.log('📊 Current selectedSegments before:', selectedSegments);
    
    // ИСПРАВЛЕНИЕ: Работаем с реальными ID сегментов, а не с индексами
    const newSelected = selectedSegments.includes(segmentId)
      ? selectedSegments.filter(id => id !== segmentId)
      : [...selectedSegments, segmentId];
    
    console.log('📊 New selectedSegments after:', newSelected);
    console.log('🔄 Calling setSelectedSegments and onSelectedSegmentsChange');
    
    setSelectedSegments(newSelected);
    onSelectedSegmentsChange?.(newSelected);
  };

  // Функция для добавления сегмента в выбранные (только для раздела результатов)
  const handleAddToSelected = async (segmentId: number) => {
    if (!user?.id || !researchId) return;
    
    console.log('🔄 Adding segment to selected:', segmentId);
    console.log('🔍 Current selected segments before:', selectedSegments);
    
    try {
      // Используем новую функцию для добавления БЕЗ сброса остальных
      const { error } = await addSegmentToSelected(researchId, segmentId);
        
      if (error) {
        console.error('❌ Database error:', error);
        toast({
          type: "error",
          title: "Ошибка",
          description: "Не удалось добавить сегмент"
        });
        return;
      }
      
      console.log('✅ Database updated successfully');
      
      // Обновляем локальное состояние СРАЗУ
      const newSelected = [...selectedSegments, segmentId];
      console.log('🔄 New selected segments:', newSelected);
      setSelectedSegments(newSelected);
      onSelectedSegmentsChange?.(newSelected);
      
      toast({
        type: "success",
        title: "Сегмент добавлен",
        description: "Сегмент добавлен в выбранные"
      });
      
    } catch (error) {
      console.error('❌ Error adding segment:', error);
      toast({
        type: "error", 
        title: "Ошибка",
        description: "Не удалось добавить сегмент"
      });
    }
  };

  // Функция для удаления сегмента из выбранных (для страницы результатов)
  const handleRemoveFromSelected = async (segmentId: number) => {
    if (!user?.id || !researchId) return;
    
    console.log('🔄 Removing segment from selected:', segmentId);
    
    try {
      // Используем функцию для удаления
      const { error } = await removeSegmentFromSelected(researchId, segmentId);
        
      if (error) {
        console.error('❌ Database error:', error);
        toast({
          type: "error",
          title: "Ошибка",
          description: "Не удалось убрать сегмент"
        });
        return;
      }
      
      console.log('✅ Database updated successfully');
      
      // Обновляем локальное состояние СРАЗУ
      const newSelected = selectedSegments.filter(id => id !== segmentId);
      setSelectedSegments(newSelected);
      onSelectedSegmentsChange?.(newSelected);
      
      toast({
        type: "success",
        title: "Сегмент убран",
        description: `"${segments.find(s => s.id === segmentId)?.title}" убран из выбранных`
      });
    } catch (error) {
      console.error('Error removing segment:', error);
      toast({
        type: "error", 
        title: "Ошибка",
        description: "Не удалось убрать сегмент"
      });
    }
  };

  // Функция для обработки клика по сегменту (для страницы выбора сегментов)
  const handleSegmentToggle = (segmentId: number) => {
    console.log('🔄 HandleSegmentToggle called with:', segmentId);
    console.log('🔍 hideTopRecommendations:', hideTopRecommendations);
    console.log('🔍 Current selectedSegments:', selectedSegments);
    
    if (hideTopRecommendations) {
      // В разделе результатов используем toggle: добавление/удаление
      const isCurrentlySelected = selectedSegments.includes(segmentId);
      if (isCurrentlySelected) {
        console.log('📋 Using handleRemoveFromSelected (results page)');
        handleRemoveFromSelected(segmentId);
      } else {
        console.log('📋 Using handleAddToSelected (results page)');
        handleAddToSelected(segmentId);
      }
    } else {
      // На странице выбора сегментов используем обычное переключение
      console.log('🔄 Using toggleSegment (selection page)');
      toggleSegment(segmentId);
    }
  };

  const handleContinueWithSegments = async () => {
    if (selectedSegments.length === 0) {
      toast({
        type: "warning",
        title: "Выберите сегменты",
        description: "Выберите хотя бы один сегмент для продолжения"
      });
      return;
    }

    if (!user?.id) {
      toast({
        type: "error",
        title: "Ошибка авторизации",
        description: "Необходимо войти в систему"
      });
      return;
    }

    let finalResearchId = researchId || originalData?.projectId;
    if (!finalResearchId) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');
      if (urlId) {
        finalResearchId = urlId;
      }
    }

    if (!finalResearchId) {
      toast({
        type: "error",
        title: "Ошибка определения исследования",
        description: "Не удалось определить ID исследования"
      });
      return;
    }

    // ИСПРАВЛЕНИЕ: selectedSegments теперь содержит реальные ID сегментов
    const selectedSegmentObjects = segments.filter(segment => 
      selectedSegments.includes(segment.id)
    );

    try {
      // Отмечаем выбранные сегменты используя их реальные ID
      console.log('🔍 Selected segment IDs:', selectedSegments);
      const { error } = await markSelectedSegments(finalResearchId, selectedSegments);
      
      if (error && error.code !== '23505') {
        toast({
          type: "error",
          title: "Ошибка сохранения",
          description: "Ошибка сохранения сегментов"
        });
        return;
      }

      await supabase
        .from('researches')
        .update({ 
          status: 'completed',
          "segmentsCount": selectedSegmentObjects.length,
          generated_segments: null
        })
        .eq('Project ID', finalResearchId);

      const allResearch = JSON.parse(localStorage.getItem('research') || '[]');
      const updated = allResearch.map((r: any) => 
        r.id === finalResearchId 
          ? { ...r, status: 'completed', segmentsCount: selectedSegmentObjects.length }
          : r
      );
      localStorage.setItem('research', JSON.stringify(updated));
      localStorage.setItem(`research-${finalResearchId}-segments`, JSON.stringify(selectedSegmentObjects));

      toast({
        type: "success",
        title: "Сегменты выбраны",
        description: `Сохранено ${selectedSegmentObjects.length} сегментов`
      });

      navigate(`/dashboard/research/${finalResearchId}`);
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        type: "error",
        title: "Ошибка сохранения",
        description: "Произошла ошибка при сохранении сегментов"
      });
    }
  };

  const handleRegenerate = async (withComment = false) => {
    if (!originalData) {
      toast({
        type: "error",
        title: "Ошибка",
        description: "Нет данных для перегенерации"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await supabase
        .from('segments')
        .delete()
        .eq('Project ID', originalData.projectId);
      
      await supabase
        .from('researches')
        .update({ 
          status: 'generating',
          generated_segments: null,
          segmentsCount: 0
        })
        .eq('Project ID', originalData.projectId);
      
      let description = originalData.description;
      
      if (withComment && regenerateComment.trim()) {
        description += `\n\nДополнительные требования пользователя: ${regenerateComment.trim()}`;
      }

      const { data, error } = await supabase.functions.invoke('direct-segment-analysis', {
        body: {
          projectName: originalData.projectName,
          description: description,
          userId: originalData.userId,
          projectId: originalData.projectId
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        if (onRegenerate) {
          onRegenerate(data.segments, data.topSegments);
        } else {
          window.location.reload();
        }

        toast({
          type: "success",
          title: "Сегменты перегенерированы",
          description: `Создано ${data.segments?.length || 0} новых сегментов`
        });
      } else {
        throw new Error(data.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('Ошибка перегенерации:', error);
      toast({
        type: "error", 
        title: "Ошибка перегенерации",
        description: "Не удалось перегенерировать сегменты"
      });
    } finally {
      setIsLoading(false);
      setShowCommentField(false);
      setRegenerateComment('');
    }
  };

  // Функция для получения короткого описания для карточки
  const getShortDescription = (description: string, maxLength: number = 150) => {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="space-y-6">
      

      {/* Main 20 segments grid - улучшенная адаптивность */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {filteredSegments.map((segment) => {
          const isSelected = selectedSegments.includes(segment.id);
          const isTopSegment = finalTopSegmentIds.includes(segment.id);
          const topRank = getTopRank(segment.id);
          
          return (
            <Card 
              key={segment.id}
              className={`group relative transition-all duration-300 hover:shadow-md rounded-xl cursor-pointer
                ${isSelected ? 'ring-2 ring-primary' : ''}
                ${isTopSegment ? 'border-2 border-amber-400/50 bg-gradient-to-br from-amber-50/20' : ''}
                hover:scale-[1.02]`}
              onClick={() => setSelectedSegmentForView(segment)}
            >
              {/* TOP badge */}
              {isTopSegment && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-3 py-1 font-bold z-10 transform rotate-12 shadow-md">
                  ТОП
                </div>
              )}
              
              <CardHeader className="relative pb-0 px-2 pt-2 sm:px-3 sm:pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Сегмент {segment.id}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSegmentToggle(segment.id);
                    }}
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <CardTitle className="text-sm font-bold line-clamp-2 break-words truncate mb-2">
                  {segment.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative px-2 pb-2 pt-1 sm:px-3 sm:pb-3">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words overflow-hidden text-ellipsis mb-2">
                  {getShortDescription(segment.description, 100)}
                </p>
                <div className="text-xs text-blue-600 font-medium truncate">
                  Нажмите для подробностей
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Top-3 Recommendations - улучшенная адаптивность */}
      {!hideTopRecommendations && finalTopSegmentIds.length > 0 && (
        <div className="space-y-4 mb-8 p-4 sm:p-6 bg-gradient-to-r from-amber-50/30 to-yellow-50/30 rounded-xl border-2 border-amber-200/50">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-semibold mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
              <span className="break-words">Рекомендации искусственного интеллекта</span>
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              ИИ проанализировал все сегменты и выбрал топ-3 наиболее перспективных
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {finalTopSegmentIds.slice(0, 3).map((topSegmentId, index) => {
              const segment = segments.find(s => s.id === topSegmentId);
              if (!segment) return null;
              
              const isSelected = selectedSegments.includes(segment.id);
              const enhancedDesc = getEnhancedDescription(segment.id);
              const reasoning = getReasoning(segment.id);
              
              return (
                <Card 
                  key={`top-${segment.id}`}
                  className={`group relative transition-all duration-300 hover:shadow-xl hover:scale-[1.02] rounded-xl overflow-hidden cursor-pointer
                    border-2 border-amber-400 bg-gradient-to-br from-amber-100/30 to-yellow-100/30
                    ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  onClick={() => setSelectedSegmentForView(segment)}
                >

                  <CardHeader className="relative px-2 pt-2 pb-0 sm:px-3 sm:pt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-amber-700">
                        Сегмент {segment.id}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSegmentToggle(segment.id);
                        }}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CardTitle className="text-base font-bold text-gray-800 break-words truncate mb-2">
                      {segment.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="relative px-2 pb-2 pt-1 sm:px-3 sm:pb-3">
                    <p className="text-sm text-gray-600 leading-relaxed break-words line-clamp-2 overflow-hidden text-ellipsis mb-2">
                      {getShortDescription(enhancedDesc || segment.description, 200)}
                    </p>
                    <div className="text-sm text-blue-600 font-medium truncate">
                      Подробнее →
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons - улучшенная адаптивность */}
      <div className="space-y-4">
        {/* Скрываем кнопку "Продолжить" для раздела результатов */}
        {!hideTopRecommendations && (
          <div className="flex justify-center">
            <Button 
              size="lg" 
              variant="hero" 
              className="rounded-xl w-full max-w-lg"
              disabled={selectedSegments.length === 0}
              onClick={handleContinueWithSegments}
            >
              Продолжить с выбранными сегментами ({selectedSegments.length})
            </Button>
          </div>
        )}

        {/* Скрываем разделитель "или" для раздела результатов */}
        {!hideTopRecommendations && (
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-muted-foreground text-sm">или</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              Генерируем новые сегменты...
            </div>
          </div>
        )}
      </div>

      {/* Modal for viewing segment details - исправленное отображение */}
      <Dialog 
        open={!!selectedSegmentForView} 
        onOpenChange={(open) => {
          if (!open) setSelectedSegmentForView(null);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedSegmentForView && (
            <>
              <DialogHeader className="flex-shrink-0 pb-4 border-b">
                <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span>Сегмент {selectedSegmentForView.id}</span>
                    {finalTopSegmentIds.includes(selectedSegmentForView.id) && (
                      <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        ТОП-{getTopRank(selectedSegmentForView.id)}
                      </div>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription className="text-base font-semibold text-foreground mt-2 break-words">
                  {selectedSegmentForView.title}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto py-4 px-1">
                <div className="space-y-6">
                  {/* Описание сегмента */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                      <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      Описание сегмента
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {modalContent?.description || selectedSegmentForView.description}
                      </p>
                    </div>
                  </div>

                  {/* Расширенный анализ от ИИ - ПОКАЗЫВАЕТСЯ для всех топ-сегментов */}
                  {modalContent?.isTopSegment && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                        Расширенный анализ от ИИ
                      </h4>
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border-l-4 border-amber-500">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {modalContent.reasoning || "Сегмент обладает высокой платежеспособностью, поскольку молодые семьи часто имеют стабильный доход и заинтересованы в долгосрочных вложениях в семью, включая питомцев. Проблема выбора безопасного и надежного питомца также актуальна."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Проблемы - показываем только для обычных сегментов */}
                  {!modalContent?.isTopSegment && modalContent?.problems && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                        Проблемы и потребности
                      </h4>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border-l-4 border-orange-500">
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {modalContent.problems}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ключевое сообщение - показываем только для обычных сегментов */}
                  {!modalContent?.isTopSegment && modalContent?.message && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                        Ключевое сообщение
                      </h4>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {modalContent.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions - теперь внизу, прилепленные */}
              <div className="flex-shrink-0 pt-4 border-t bg-background">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground text-center sm:text-left">
                    {selectedSegments.includes(selectedSegmentForView.id) 
                      ? "✅ Сегмент выбран для анализа" 
                      : "Сегмент не выбран"}
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSegmentToggle(selectedSegmentForView.id);
                    }}
                    variant={selectedSegments.includes(selectedSegmentForView.id) ? "destructive" : "default"}
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    {selectedSegments.includes(selectedSegmentForView.id) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Убрать из выбранных
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Добавить к анализу
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
