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
  const [completedAnalyses, setCompletedAnalyses] = useState<string[]>([]);
  const [analyzingTypes, setAnalyzingTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingAnalysis, setDeletingAnalysis] = useState<string | null>(null);

  // Простая функция для загрузки завершенных анализов
  const loadCompletedAnalyses = async () => {
    try {
      const { data, error } = await getCompletedAnalyses(researchId, parseInt(segmentId));
      if (!error && data) {
        const completed = data.map((analysis: any) => analysis.analysis_type);
        setCompletedAnalyses(completed);
      }
    } catch (error) {
      console.error('Error loading completed analyses:', error);
    }
  };

  // Простая функция для загрузки анализирующихся типов
  const loadAnalyzingTypes = async () => {
    const analyzing: string[] = [];
    
    // Проверяем sessionStorage
    ANALYSIS_OPTIONS.forEach(option => {
      const key = `analyzing-${researchId}-${segmentId}-${option.id}`;
      const data = sessionStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const startedAt = new Date(parsed.startedAt).getTime();
          const now = Date.now();
          
          // Если анализ идет меньше 30 минут
          if (now - startedAt < 30 * 60 * 1000) {
            analyzing.push(option.id);
          } else {
            sessionStorage.removeItem(key);
          }
        } catch (e) {
          sessionStorage.removeItem(key);
        }
      }
    });

    // Проверяем БД на анализы в процессе
    try {
      const { data: processingData } = await supabase
        .from('segment_analyses')
        .select('analysis_type, created_at')
        .match({
          'Project ID': researchId,
          'Сегмент ID': Number(segmentId),
          'status': 'processing'
        });

      if (processingData) {
        const now = Date.now();
        processingData.forEach((analysis: any) => {
          const createdAt = new Date(analysis.created_at).getTime();
          if (now - createdAt < 30 * 60 * 1000) {
            if (!analyzing.includes(analysis.analysis_type)) {
              analyzing.push(analysis.analysis_type);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error checking processing analyses:', error);
    }
    
    setAnalyzingTypes(analyzing);
  };

  // Инициализация данных
  useEffect(() => {
    if (user?.id) {
      loadCompletedAnalyses();
      loadAnalyzingTypes();
    }
  }, [researchId, segmentId, user?.id]);

  // Подписка на real-time обновления
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
        },
        (payload) => {
          const row: any = (payload as any).new || (payload as any).old;
          if (row?.["Project ID"] === researchId && row?.["Сегмент ID"] === Number(segmentId)) {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const analysisType = (payload as any).new?.analysis_type;
              if (analysisType) {
                // Убираем из анализирующихся
                const key = `analyzing-${researchId}-${segmentId}-${analysisType}`;
                sessionStorage.removeItem(key);
                setAnalyzingTypes(prev => prev.filter(type => type !== analysisType));
                
                // Обновляем завершенные
                loadCompletedAnalyses();
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [researchId, segmentId, user?.id]);

  const handleOptionToggle = (optionId: string) => {
    const option = ANALYSIS_OPTIONS.find(opt => opt.id === optionId);
    if (!option || option.required || completedAnalyses.includes(optionId)) return;

    const segmentDescriptionCompleted = completedAnalyses.includes("segment_description");
    if (!segmentDescriptionCompleted && option.id !== "segment_description") return;

    if (option.id === "solutions_analysis" && !completedAnalyses.includes("problems_analysis")) return;
    
    if (option.id === "content_themes") {
      const requiredForContent = ["segment_description", "bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas"];
      if (!requiredForContent.every(id => completedAnalyses.includes(id))) return;
    }
    
    if (option.id === "niche_integration") {
      const allAnalysisOptions = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "content_themes", "user_personas"];
      if (!allAnalysisOptions.every(id => completedAnalyses.includes(id))) return;
    }

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
    if (selectedOptions.length === 0 || isLoading) return;

    setIsLoading(true);
    onAnalysisStart?.(selectedOptions);

    try {
      for (const analysisType of selectedOptions) {
        if (completedAnalyses.includes(analysisType) || analyzingTypes.includes(analysisType)) continue;

        // Сохраняем статус в sessionStorage
        const key = `analyzing-${researchId}-${segmentId}-${analysisType}`;
        sessionStorage.setItem(key, JSON.stringify({
          startedAt: new Date().toISOString(),
          analysisType
        }));

        // Обновляем состояние
        setAnalyzingTypes(prev => [...prev, analysisType]);

        // Получаем данные сегмента перед анализом
        let segmentName = '';
        let segmentDescription = '';
        
        try {
          const { data: segmentData } = await supabase
            .from('segments')
            .select('*')
            .eq('Project ID', researchId)
            .eq('Сегмент ID', parseInt(segmentId))
            .single();
          
          if (segmentData) {
            segmentName = segmentData['Название сегмента'] || `Сегмент ${segmentId}`;
            segmentDescription = segmentData['Описание сегмента'] || '';
          }
        } catch (error) {
          console.error('Error loading segment data:', error);
          segmentName = `Сегмент ${segmentId}`;
        }

        try {
          const result = await analyzeSegment({
            researchId,
            segmentId: parseInt(segmentId),
            segmentName,
            segmentDescription,
            analysisType,
          });

          if (result?.text) {
            await saveSegmentAnalysis(researchId, parseInt(segmentId), segmentName, analysisType, result.text);
            
            toast({
              type: "success",
              title: "Анализ завершен",
              description: `${ANALYSIS_OPTIONS.find(opt => opt.id === analysisType)?.name} готов`
            });
          }
        } catch (error) {
          console.error(`Error analyzing ${analysisType}:`, error);
          toast({
            type: "error", 
            title: "Ошибка анализа",
            description: `Не удалось выполнить ${ANALYSIS_OPTIONS.find(opt => opt.id === analysisType)?.name}`
          });
        } finally {
          // Убираем из анализирующихся
          sessionStorage.removeItem(key);
          setAnalyzingTypes(prev => prev.filter(type => type !== analysisType));
        }
      }

      // Обновляем завершенные анализы
      await loadCompletedAnalyses();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisType: string) => {
    if (deletingAnalysis) return;
    
    setDeletingAnalysis(analysisType);
    
    try {
      const { error } = await deleteSegmentAnalysis(researchId, parseInt(segmentId), analysisType);
      
      if (error) {
        toast({
          type: "error",
          title: "Ошибка",
          description: "Не удалось удалить анализ"
        });
      } else {
        setCompletedAnalyses(prev => prev.filter(type => type !== analysisType));
        toast({
          type: "success", 
          title: "Анализ удален",
          description: "Анализ успешно удален"
        });
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({
        type: "error",
        title: "Ошибка",
        description: "Произошла ошибка при удалении"
      });
    } finally {
      setDeletingAnalysis(null);
    }
  };

  const selectedCount = selectedOptions.length;
  const completedCount = completedAnalyses.length;
  const totalCount = ANALYSIS_OPTIONS.length;

  const groupedOptions = ANALYSIS_OPTIONS.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, AnalysisOption[]>);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Готовые анализы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{completedCount}</div>
              <p className="text-xs text-muted-foreground">
                {completedCount} {getAnalysisWord(completedCount)} {getVerbForm(completedCount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">В процессе</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{analyzingTypes.length}</div>
              <p className="text-xs text-muted-foreground">
                {analyzingTypes.length > 0 ? "Анализ выполняется" : "Нет активных анализов"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Выбрано</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{selectedCount}</div>
              <p className="text-xs text-muted-foreground">
                из {totalCount} доступных
              </p>
            </CardContent>
          </Card>
        </div>

        {Object.entries(groupedOptions).map(([category, options]) => {
          const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
          return (
            <Card key={category} className="overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {options.map((option) => {
                      const isCompleted = completedAnalyses.includes(option.id);
                      const isAnalyzing = analyzingTypes.includes(option.id);
                      const isSelected = selectedOptions.includes(option.id);
                      const isRequired = option.required;

                      let isDisabled = false;
                      let disabledReason = "";

                      if (isCompleted || isAnalyzing) {
                        isDisabled = true;
                      } else {
                        const segmentDescriptionCompleted = completedAnalyses.includes("segment_description");
                        if (!segmentDescriptionCompleted && option.id !== "segment_description") {
                          isDisabled = true;
                          disabledReason = "Сначала завершите описание сегмента";
                        }

                        if (option.id === "solutions_analysis" && !completedAnalyses.includes("problems_analysis")) {
                          isDisabled = true;
                          disabledReason = "Сначала завершите анализ проблем";
                        }

                        if (option.id === "content_themes") {
                          const requiredForContent = ["segment_description", "bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "user_personas"];
                          if (!requiredForContent.every(id => completedAnalyses.includes(id))) {
                            isDisabled = true;
                            disabledReason = "Завершите все предыдущие анализы";
                          }
                        }

                        if (option.id === "niche_integration") {
                          const allAnalysisOptions = ["bdf_analysis", "problems_analysis", "solutions_analysis", "jtbd_analysis", "content_themes", "user_personas"];
                          if (!allAnalysisOptions.every(id => completedAnalyses.includes(id))) {
                            isDisabled = true;
                            disabledReason = "Завершите все анализы аудитории";
                          }
                        }

                        if (option.id === "final_report") {
                          const allAnalysisOptions = ANALYSIS_OPTIONS.filter(opt => opt.category === "analysis");
                          if (!allAnalysisOptions.every(opt => completedAnalyses.includes(opt.id))) {
                            isDisabled = true;
                            disabledReason = "Завершите все анализы";
                          }
                        }
                      }

                      const OptionElement = (
                        <div 
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isCompleted ? 'bg-success/10 border-success/30' :
                            isAnalyzing ? 'bg-primary/10 border-primary/30' :
                            isSelected ? 'bg-secondary/20 border-secondary' :
                            isDisabled ? 'bg-muted/50 border-muted' :
                            'bg-background border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              ) : isAnalyzing ? (
                                <div className="flex items-center space-x-2">
                                  <Spinner className="h-4 w-4" />
                                </div>
                              ) : isDisabled ? (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleOptionToggle(option.id)}
                                  disabled={isDisabled}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium whitespace-pre-line ${
                                  isCompleted ? 'text-success' :
                                  isAnalyzing ? 'text-primary' :
                                  isDisabled ? 'text-muted-foreground' : ''
                                }`}>
                                  {option.name}
                                </h4>
                                {isRequired && (
                                  <Badge variant="outline" className="text-xs">
                                    Обязательный
                                  </Badge>
                                )}
                                {isAnalyzing && (
                                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                    Анализируется
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                {option.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCompleted && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewResult?.(option.id)}
                                  className="text-xs"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost" 
                                      size="sm"
                                      disabled={deletingAnalysis === option.id}
                                      className="text-xs text-destructive hover:text-destructive"
                                    >
                                      {deletingAnalysis === option.id ? (
                                        <Spinner className="h-3 w-3" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Удалить анализ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Вы уверены, что хотите удалить "{option.name}"? Это действие нельзя отменить.
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
                              </>
                            )}
                          </div>
                        </div>
                      );

                      return isDisabled && disabledReason ? (
                        <Tooltip key={option.id}>
                          <TooltipTrigger asChild>
                            {OptionElement}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{disabledReason}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div key={option.id}>
                          {OptionElement}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleStartAnalysis}
            disabled={selectedCount === 0 || isLoading || analyzingTypes.length > 0}
            size="lg"
            className="min-w-[200px]"
          >
            {isLoading || analyzingTypes.length > 0 ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Анализ в процессе...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Начать анализ ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
