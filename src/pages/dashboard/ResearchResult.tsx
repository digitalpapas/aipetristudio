import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Trash2, RefreshCw, Lock, Eye, ArrowRight, X, Star } from "lucide-react";
import SegmentCards from "@/components/dashboard/SegmentCards";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { useAuth } from "@/contexts/AuthContext";
import { deleteResearch, updateResearch, getResearch, getSegments } from "@/lib/supabase-utils";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from "lodash";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ResearchResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useCustomToast();
  const { user } = useAuth();
  
  // Умная инициализация с поиском по разным типам ID
  const [research, setResearch] = useState<any>(() => {
    if (!id) return null;
    
    const allResearch = JSON.parse(localStorage.getItem('research') || '[]');
    
    // Попробуем найти исследование по точному совпадению ID
    let foundResearch = allResearch.find((r: any) => r.id === id);
    
    // Если не найдено по ID, попробуем найти по Project ID (может быть timestamp)
    if (!foundResearch) {
      foundResearch = allResearch.find((r: any) => r["Project ID"] === id);
    }
    
    // Если не найдено по Project ID, попробуем найти по названию проекта "Мармеладус"
    if (!foundResearch && id === "1755497814752") {
      foundResearch = allResearch.find((r: any) => 
        r["Project name"]?.toLowerCase().includes("мармеладус") ||
        r.title?.toLowerCase().includes("мармеладус")
      );
    }
    
    // Если найдено, создаем fallback объект с базовой информацией для мгновенного отображения
    if (foundResearch) {
      return {
        ...foundResearch,
        // Обеспечиваем наличие базовых полей для отображения
        title: foundResearch.title || foundResearch["Project name"] || "Исследование",
        "Project name": foundResearch["Project name"] || foundResearch.title || "Исследование",
        status: foundResearch.status || "completed"
      };
    }
    
    // Если ничего не найдено в localStorage, создаем минимальный объект для показа интерфейса
    // чтобы избежать экрана загрузки при наличии данных в Supabase
    return {
      id: id,
      title: "Загружается...",
      "Project name": "Загружается...",
      status: "completed" // для показа основного интерфейса
    };
  });
  
  const [localTitle, setLocalTitle] = useState(research?.["Project name"] || research?.title || "");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  
  
  const [segments, setSegments] = useState<any[]>(() => {
    if (!id) return [];
    const savedSegments = localStorage.getItem(`research-${id}-segments`);
    return savedSegments ? JSON.parse(savedSegments) : [];
  });
  
  // Добавляем состояние для всех сгенерированных сегментов (20 штук)
  const [allGeneratedSegments, setAllGeneratedSegments] = useState<any[]>(() => {
    if (!id) return [];
    const savedAllSegments = localStorage.getItem(`research-${id}-all-segments`);
    return savedAllSegments ? JSON.parse(savedAllSegments) : [];
  });
  
  // Добавляем состояние для топ сегментов чтобы избежать повторных загрузок
  const [topSegmentsData, setTopSegmentsData] = useState<any[]>(() => {
    if (!id) return [];
    const savedTopSegments = localStorage.getItem(`research-${id}-top-segments`);
    return savedTopSegments ? JSON.parse(savedTopSegments) : [];
  });
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Состояние для диалога подтверждения удаления
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<number | null>(null);

  const [isRetrying, setIsRetrying] = useState(false);
  // Removed isLoading state - show interface immediately like ResearchSegmentPage
  
  // Load data from Supabase in background without affecting instant UI display
  useEffect(() => {
    const loadDataFromSupabase = async () => {
      if (!id || !user?.id) return;
      
      try {
        // Load research data from Supabase
        const { data } = await getResearch(id);
        
        if (data) {
          // Create updated research object with compatible fields
          const updatedResearch = {
            ...data,
            title: data["Project name"], // For localStorage compatibility
            createdAt: data.created_at   // For localStorage compatibility
          };
          
          // Always update with fresh data from Supabase
          setResearch(updatedResearch);
          
          // Update localTitle with the data from Supabase
          setLocalTitle(data["Project name"]);
          setIsInitialLoad(false);
          
          // Update page title
          document.title = `${data["Project name"]} | Результаты`;
          
          // Update localStorage with Supabase data
          const allResearch = JSON.parse(localStorage.getItem('research') || '[]');
          const updated = allResearch.map((r: any) => 
            r.id === id ? updatedResearch : r
          );
          
          // Add record if not in localStorage
          if (!allResearch.find((r: any) => r.id === id)) {
            updated.push(updatedResearch);
          }
          localStorage.setItem('research', JSON.stringify(updated));
          
          // Handle status-based navigation
          const researchStatus = data.status || 'completed';
          
          if (researchStatus === "awaiting_selection") {
            // Проверяем, есть ли уже сохраненные сегменты
            const { data: segmentsData } = await getSegments(id);
            
            // Если сегменты уже выбраны и сохранены, НЕ перенаправляем
            if (segmentsData && segmentsData.length > 0) {
              // Продолжаем загрузку страницы результатов
              console.log('Сегменты уже выбраны, показываем результаты');
            } else {
              // Только если сегментов действительно нет - перенаправляем на выбор
              navigate(`/dashboard/research/new?id=${id}`);
              return;
            }
          } else if (researchStatus === "error") {
            const { data: segmentsData } = await getSegments(id);
            if (!segmentsData || segmentsData.length === 0) {
              navigate(`/dashboard/research/new?id=${id}`);
              return;
            }
          } else if (researchStatus === "generating" || researchStatus === "processing") {
            navigate(`/dashboard/research/new?id=${id}`);
            return;
          }
          
          // Load SELECTED segments from Supabase (for "Выбранные сегменты" tab)
          const { data: allSegmentsFromDB } = await getSegments(id);
          if (allSegmentsFromDB && allSegmentsFromDB.length > 0) {
            // Фильтруем только выбранные сегменты для вкладки "Выбранные сегменты"
            const selectedSegments = allSegmentsFromDB.filter((segment: any) => segment.is_selected);
            const formattedSegments = selectedSegments.map((segment: any) => ({
              id: segment["Сегмент ID"],
              title: segment["Название сегмента"],
              description: segment.description,
              problems: segment.problems,
              message: segment.message
            }));
            setSegments(formattedSegments);
            
            // Sync segments with localStorage
            localStorage.setItem(`research-${id}-segments`, JSON.stringify(formattedSegments));
          }
          
          // Load all generated segments directly from segments table (принудительно обновляем)
          console.log('🔍 Loading all segments directly from segments table for research:', id);
          
          
          const { data: allSegmentsData, error: allSegmentsError } = await supabase
            .from('segments')
            .select('*')
            .eq('Project ID', id)
            .order('Сегмент ID');

          if (allSegmentsError) {
            console.error('Error loading all segments:', allSegmentsError);
          } else if (allSegmentsData && allSegmentsData.length > 0) {
            // Форматируем данные точно как на странице выбора сегментов
            const formattedAllSegments = allSegmentsData.map((segment: any) => ({
              id: segment["Сегмент ID"],
              title: segment["Название сегмента"],
              description: segment.description,
              problems: segment.problems,
              message: segment.message
            }));
            
            console.log('✅ Successfully loaded all segments from database:', formattedAllSegments.length);
            console.log('📋 Sample segment:', formattedAllSegments[0]);
            setAllGeneratedSegments(formattedAllSegments);
            localStorage.setItem(`research-${id}-all-segments`, JSON.stringify(formattedAllSegments));
          } else {
            console.log('⚠️ No segments found in database, using selected segments as fallback');
            // Только если в БД вообще нет сегментов, используем выбранные как fallback
            if (allSegmentsFromDB && allSegmentsFromDB.length > 0) {
              const fallbackSegments = allSegmentsFromDB.map((segment: any) => ({
                id: segment["Сегмент ID"],
                title: segment["Название сегмента"],
                description: segment.description,
                problems: segment.problems,
                message: segment.message
              }));
              setAllGeneratedSegments(fallbackSegments);
            }
          }
          
          // Загружаем топ сегменты из таблицы top_segments
          const { data: topSegments } = await supabase
            .from('top_segments')
            .select('*')
            .eq('project_id', id)
            .order('rank');
            
          if (topSegments && topSegments.length > 0) {
            setTopSegmentsData(topSegments);
            // Сохраняем топ сегменты в localStorage для мгновенного отображения
            localStorage.setItem(`research-${id}-top-segments`, JSON.stringify(topSegments));
          }
          
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        setIsInitialLoad(false);
      }
    };

    loadDataFromSupabase();
  }, [id, user?.id, navigate]);

  // Создаем debounced функцию сохранения
  const debouncedSave = useCallback(
    debounce(async (newName: string) => {
      if (!research || !user?.id || !id) return;
      
      try {
        const { error } = await updateResearch(id, { "Project name": newName });
        
        if (!error) {
          // Обновляем локальное состояние
          const updatedResearch = { ...research, "Project name": newName, title: newName };
          setResearch(updatedResearch);
          
          // Обновляем localStorage
          const allResearch = JSON.parse(localStorage.getItem('research') || '[]');
          const updated = allResearch.map((r: any) => 
            r.id === id ? updatedResearch : r
          );
          localStorage.setItem('research', JSON.stringify(updated));
          
          toast({ 
            type: "success",
            title: "Название обновлено",
            description: "Изменения сохранены в базе данных"
          });
        } else {
          toast({
            type: "error",
            title: "Ошибка обновления",
            description: "Не удалось сохранить название в базе данных"
          });
        }
      } catch (error) {
        console.error('Error updating research name:', error);
      }
    }, 1000), // Задержка 1 секунда
    [research, user?.id, id]
  );

  // Обновляем useEffect для синхронизации localTitle
  useEffect(() => {
    setLocalTitle(research?.["Project name"] || research?.title || "");
  }, [research]);

  // Обработчик изменения
  const handleNameChange = (newName: string) => {
    setLocalTitle(newName);
    debouncedSave(newName);
  };

  const handleDeleteResearch = async () => {
    if (!user?.id || !id) return;

    try {
      // Удаляем из Supabase
      const { error } = await deleteResearch(id);
      
      if (error) {
        console.error('Error deleting research from Supabase:', error);
        toast({
          type: "error",
          title: "Ошибка удаления",
          description: "Не удалось удалить исследование из базы данных"
        });
        return;
      }

      // Удаляем из localStorage
      const allKeys = Object.keys(localStorage);
      const keysToRemove = allKeys.filter(key => 
        key === 'research' ||
        key.includes(id) ||
        key.includes(`research-${id}`) ||
        key.includes(`selectedSegments_${id}`) ||
        key.includes(`analysis_${id}_`) ||
        key.includes(`segment-analysis-${id}-`)
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Обновляем основной массив исследований в localStorage
      const currentResearch = JSON.parse(localStorage.getItem('research') || '[]');
      const updatedResearch = currentResearch.filter((r: any) => r.id !== id);
      localStorage.setItem('research', JSON.stringify(updatedResearch));
      
      toast({ 
        type: "delete",
        title: "Исследование удалено",
        description: "Все данные успешно удалены"
      });
      
      // Переходим на главную страницу
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting research:', error);
      toast({
        type: "error",
        title: "Ошибка удаления",
        description: "Произошла ошибка при удалении исследования"
      });
    }
  };

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

  const handleDuplicate = () => {
    toast({ 
      type: "info",
      title: "В разработке",
      description: "Функция дублирования скоро будет доступна"
    });
  };

  const handleRetryAnalysis = async () => {
    if (!research || !user?.id) return;

    setIsRetrying(true);
    
    try {
      // Получаем актуальные данные из Supabase для отправки
      const { data: supabaseResearch, error: fetchError } = await getResearch(id!);
      
      if (fetchError) {
        console.error('Error fetching research from Supabase:', fetchError);
        toast({
          type: "error",
          title: "Ошибка получения данных",
          description: "Ошибка получения данных исследования"
        });
        setIsRetrying(false);
        return;
      }

      // Обновляем статус на "processing" в Supabase и localStorage
      const { error: updateError } = await updateResearch(id!, { description: `${supabaseResearch?.description || research.description} - Retry attempt` });
      
      if (updateError) {
        console.error('Error updating research status:', updateError);
      }
      
      const allResearch = JSON.parse(localStorage.getItem('research') || '[]');
      const updatedResearch = allResearch.map((r: any) => 
        r.id === id ? { ...r, status: "processing" } : r
      );
      localStorage.setItem('research', JSON.stringify(updatedResearch));
      
      // Подготавливаем данные для повторной отправки из Supabase (оригинальные данные)
      const webhookData = {
        user_id: user.id,
        research_id: id,
        analysis_type: "research_retry",
        status: 'pending',
        userEmail: user.email,
        projectName: supabaseResearch?.["Project name"] || research.title,
        type: research.type || "idea",
        content: supabaseResearch?.description || research.description,
        isRetry: true,
        timestamp: new Date().toISOString()
      };

      console.log('Повторная отправка на webhook:', webhookData);
      
      const response = await fetch(
        "https://hedayupokost.beget.app/webhook-test/bc559004-5763-43e5-ab65-60e83cdedcf9",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookData),
        }
      );

      if (response.ok) {
        const result = await response.text(); // Получаем текст напрямую
        console.log('Результат повторной попытки:', result);
        
        // Обновляем исследование с результатами
        await updateResearch(id!, { description: `${supabaseResearch?.description || research.description} - Retry successful` });
        
        const updatedResearchSuccess = allResearch.map((r: any) => 
          r.id === id 
            ? { ...r, status: "completed", generatedSegments: { result: result } }
            : r
        );
        localStorage.setItem('research', JSON.stringify(updatedResearchSuccess));
        
        toast({
          title: "Успешно",
          description: "Анализ завершен при повторной попытке!"
        });
        
        // Перезагружаем страницу для отображения результатов
        window.location.reload();
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Ошибка при повторной попытке:", error);
      
      // Возвращаем статус ошибки
      const allResearch = JSON.parse(localStorage.getItem('research') || '[]');
      const updatedResearch = allResearch.map((r: any) => 
        r.id === id ? { ...r, status: "error" } : r
      );
      localStorage.setItem('research', JSON.stringify(updatedResearch));
      
      toast({
        type: "error",
        title: "Ошибка повторной попытки",
        description: "Повторная попытка не удалась. Попробуйте еще раз позже."
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Функция для подтверждения удаления сегмента
  const confirmRemoveFromSelected = async () => {
    if (segmentToDelete === null) return;
    
    await handleRemoveFromSelected(segmentToDelete);
    setDeleteDialogOpen(false);
    setSegmentToDelete(null);
  };

  // Функция для удаления сегмента из выбранных
  const handleRemoveFromSelected = async (segmentId: number) => {
    if (!user?.id || !id) return;
    
    try {
      // Обновляем флаг is_selected в базе данных
      const { error } = await supabase
        .from('segments')
        .update({ is_selected: false })
        .eq('Project ID', id)
        .eq('Сегмент ID', segmentId);
        
      if (error) {
        toast({
          type: "error",
          title: "Ошибка",
          description: "Не удалось удалить сегмент"
        });
        return;
      }
      
      // Обновляем локальное состояние - убираем сегмент из выбранных СРАЗУ
      const updatedSegments = segments.filter(s => s.id !== segmentId);
      setSegments(updatedSegments);
      
      // Обновляем localStorage
      localStorage.setItem(`research-${id}-segments`, JSON.stringify(updatedSegments));
      
      toast({
        type: "success",
        title: "Сегмент удален",
        description: "Сегмент удален из выбранных"
      });
      
    } catch (error) {
      console.error('Error removing segment:', error);
      toast({
        type: "error",
        title: "Ошибка", 
        description: "Не удалось удалить сегмент"
      });
    }
  };

  // Показываем минимальную заглушку пока данные не загрузились из Supabase
  if (!research) {
    return (
      <main className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к исследованиям
          </Button>
        </div>
        
        <div className="space-y-3">
          <Skeleton className="h-10 w-80" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        
        <Card className="rounded-2xl">
          <CardContent className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h3 className="font-semibold mb-2">Загружаем данные...</h3>
            <p className="text-muted-foreground">
              Получаем информацию об исследовании
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Если исследование в процессе генерации
  if (research?.status === "processing" || research?.status === "generating") {
    return (
      <main className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к исследованиям
          </Button>
        </div>
        
        <header className="flex items-center gap-3">
          <div className="relative max-w-md">
            <Input 
              value={localTitle} 
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={research?.status === "processing" || research?.status === "generating"}
              className={`${research?.status === "processing" || research?.status === "generating" ? "bg-muted text-muted-foreground cursor-not-allowed pr-10" : ""}`}
              title={research?.status === "processing" || research?.status === "generating" ? "Редактирование заблокировано во время генерации сегментов" : ""}
            />
            {(research?.status === "processing" || research?.status === "generating") && (
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="text-sm text-muted-foreground">{research?.createdAt ? new Date(research.createdAt).toLocaleDateString("ru-RU") : ""}</div>
        </header>

        <Card className="rounded-2xl">
          <CardContent className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h3 className="font-semibold mb-2">Генерируем сегменты...</h3>
            <p className="text-muted-foreground">
              Анализируем данные и создаем целевые аудитории
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Если есть ошибка генерации
  if (research?.status === "error") {
    return (
      <main className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к исследованиям
          </Button>
        </div>
        
        <header className="flex items-center gap-3">
          <Input 
            value={localTitle} 
            onChange={(e) => handleNameChange(e.target.value)}
            className="max-w-md"
          />
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {(() => {
              const date = research?.created_at || research?.createdAt;
              return date ? new Date(date).toLocaleDateString("ru-RU") : "";
            })()}
          </div>
        </header>

        <Card className="rounded-2xl border-destructive">
          <CardContent className="text-center py-8">
            <div className="h-12 w-12 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-destructive">⚠</span>
            </div>
            <h3 className="font-semibold mb-2">Ошибка генерации</h3>
            <p className="text-muted-foreground mb-6">
              Произошла ошибка при создании сегментов. Вы можете попробовать еще раз или удалить исследование.
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={handleRetryAnalysis}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isRetrying ? "Повторяем..." : "Попробовать еще раз"}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleDeleteResearch}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Удалить исследование
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Если сегменты сгенерированы, но еще не выбраны
  if (research?.status === "awaiting_selection" && segments.length === 0) {
      return (
        <main className="space-y-5">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к исследованиям
            </Button>
          </div>
          
          <header className="flex items-center gap-3">
            <Input 
              value={localTitle}
              onChange={(e) => handleNameChange(e.target.value)}
              className="max-w-md" 
            />
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {(() => {
                const date = research?.created_at || research?.createdAt;
                return date ? new Date(date).toLocaleDateString("ru-RU") : "";
              })()}
            </div>
          </header>

          <SegmentCards 
            segments={segments || []} // Используем сегменты из таблицы segments
            researchTitle={research?.["Project name"] || research?.title || ""}
            researchId={id} // Передаем ID для загрузки топ-сегментов
            onSelectedSegmentsChange={(selectedIds) => {
              console.log('Выбранные сегменты:', selectedIds);
              // Обновляем счетчик сегментов в основной записи исследования
              const allResearch = JSON.parse(localStorage.getItem('research') || '[]');
              const updated = allResearch.map((r: any) => 
                r.id === id ? { ...r, segmentsCount: selectedIds.length } : r
              );
              localStorage.setItem('research', JSON.stringify(updated));
            }}
          />
        </main>
      );
    }

  return (
    <main className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к исследованиям
        </Button>
      </div>
      
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Input 
            value={localTitle} 
            onChange={(e) => handleNameChange(e.target.value)}
            className="max-w-md"
          />
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {(() => {
              const date = research?.created_at || research?.createdAt;
              return date ? new Date(date).toLocaleDateString("ru-RU") : "";
            })()}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
            onClick={handleExport}
          >
            <span className="hidden sm:inline">Экспорт</span>
            <span className="sm:hidden">📤</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
            onClick={handleShare}
          >
            <span className="hidden sm:inline">Поделиться</span>
            <span className="sm:hidden">🔗</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
            onClick={handleDuplicate}
          >
            <span className="hidden sm:inline">Дублировать</span>
            <span className="sm:hidden">📋</span>
          </Button>
        </div>
      </header>

        <div>
          <Tabs defaultValue="all-segments" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all-segments">Сегменты</TabsTrigger>
            <TabsTrigger value="selected-segments">Выбранные сегменты</TabsTrigger>
          </TabsList>

          <TabsContent value="all-segments" className="space-y-4">
            {/* Отображаем все сгенерированные сегменты (20 штук) с выделением топ-3 */}
            {allGeneratedSegments && allGeneratedSegments.length > 0 ? (
              <SegmentCards 
                segments={allGeneratedSegments}
                topSegments={topSegmentsData} // Передаем уже загруженные топ сегменты как TopSegmentData[]
                selectedSegments={useMemo(() => segments.map(s => s.id), [segments])} // Используем useMemo для предотвращения пересоздания массива
                researchTitle={localTitle}
                researchId={id}
                hideTopRecommendations={true} // Скрываем отдельный блок рекомендаций ИИ
                originalData={{
                  projectName: localTitle,
                  description: research?.description || '',
                  userId: user?.id || '',
                  projectId: id || ''
                }}
                
                onSelectedSegmentsChange={(selectedIds) => {
                  console.log('Новые выбранные сегменты:', selectedIds);
                  // Обновляем состояние выбранных сегментов в реальном времени
                  const newSelectedSegments = allGeneratedSegments.filter(seg => selectedIds.includes(seg.id));
                  setSegments(newSelectedSegments);
                  localStorage.setItem(`research-${id}-segments`, JSON.stringify(newSelectedSegments));
                }}
              />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground mb-4">
                    Все сегменты загружаются...
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Debug: allSegments={allGeneratedSegments?.length || 0}, status={research?.status}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="selected-segments" className="mt-4">
            {/* Отображаем только выбранные сегменты */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {segments.length > 0 ? (
                segments.map((segment) => (
                  <Card 
                    key={segment.id} 
                    className="group relative transition-all duration-300 hover:shadow-md rounded-xl cursor-pointer hover:border-primary/50"
                    onClick={() => navigate(`/dashboard/research/${id}/segment/${segment.id}`)}
                  >
                    <CardHeader className="relative pb-0 px-2 pt-2 sm:px-3 sm:pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Сегмент {segment.id}
                        </span>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSegmentToDelete(segment.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold line-clamp-2 break-words truncate mb-2">
                        {segment.title}
                      </h3>
                    </CardHeader>
                    <CardContent className="relative px-2 pb-2 pt-1 sm:px-3 sm:pb-3">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 break-words overflow-hidden text-ellipsis">
                        {segment.description}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                        <span>Перейти к анализу</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="pt-6 text-center">
                    <div className="text-muted-foreground mb-4">
                      Сегменты для анализа еще не выбраны.
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Переключаемся на первую вкладку для выбора сегментов
                        const allSegmentsTab = document.querySelector('[value="all-segments"]') as HTMLElement;
                        allSegmentsTab?.click();
                      }}
                    >
                      Выбрать сегменты
                    </Button>
                  </CardContent>
                </Card>
               )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот сегмент из выбранных? 
              Это действие также удалит все связанные с сегментом данные анализа и исследований из базы данных.
              Данное действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSegmentToDelete(null);
            }}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveFromSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
