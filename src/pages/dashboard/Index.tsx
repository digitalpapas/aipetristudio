import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MoreVertical } from "lucide-react";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { deleteResearch, getUserResearches, getResearchSegmentCount, migrateLocalStorageToSupabase, updateResearch } from "@/lib/supabase-utils";
import { useAuth } from "@/contexts/AuthContext";

export type ResearchStatus = "done" | "draft";

type Research = {
  id: string;
  title: string;
  createdAt: string;
  status: ResearchStatus;
  segments: number;
  progress?: number;
  dbStatus?: string; // Оригинальный статус из БД для навигации
};

const initialData: Research[] = [
  { id: "1", title: "Марафон здорового питания", createdAt: "2025-08-01", status: "done", segments: 5 },
  { id: "3", title: "Сервис доставки цветов", createdAt: "2025-08-10", status: "draft", segments: 0 },
];

export default function DashboardHome() {
  const navigate = useNavigate();
  const { toast } = useCustomToast();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | ResearchStatus>("all");
  const [isLoading, setIsLoading] = useState(false);
  
  const [research, setResearch] = useState<Research[]>([]);

  // Кэш для быстрого отображения
  const loadCachedResearches = () => {
    try {
      const cached = localStorage.getItem('dashboard_cache');
      if (cached) {
        const cachedData = JSON.parse(cached);
        // Проверяем, что кэш не старше 5 минут
        if (Date.now() - cachedData.timestamp < 300000) {
          setResearch(cachedData.data);
          return true;
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки кэша:', error);
    }
    return false;
  };

  // Сохранение в кэш
  const saveCacheResearches = (data: Research[]) => {
    try {
      localStorage.setItem('dashboard_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Ошибка сохранения кэша:', error);
    }
  };

  // Функция загрузки данных из Supabase
  const loadResearches = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      if (user?.id) {
        // НЕ выполняем миграцию из localStorage чтобы избежать дублирования
        // Работаем только с данными из Supabase как единственным источником правды
        
        // Теперь загружаем из Supabase как единственного источника правды
        const { data: supabaseResearches, error } = await getUserResearches(user.id);
        
        if (!error && supabaseResearches) {
          // Преобразуем данные без сегментов для быстрого отображения
          const basicResearches = supabaseResearches.map((item: any) => {
            const dbStatus = item.status || 'generating';
            let uiStatus: ResearchStatus;
            let progress = 0;
            
            switch (dbStatus) {
              case 'error':
                uiStatus = 'draft';
                progress = 0;
                break;
              case 'generating':
              case 'processing':
              case 'awaiting_selection':
                uiStatus = 'draft';
                progress = 0;
                break;
              case 'completed':
                uiStatus = 'done';
                progress = 100;
                break;
              default:
                uiStatus = 'draft';
                progress = 0;
            }
            
            // Проверяем кэш для количества сегментов
            let cachedSegmentCount = 0;
            try {
              const cached = localStorage.getItem('dashboard_cache');
              if (cached) {
                const cachedData = JSON.parse(cached);
                const cachedResearch = cachedData.data?.find((r: any) => r.id === item["Project ID"]);
                if (cachedResearch && typeof cachedResearch.segments === 'number') {
                  cachedSegmentCount = cachedResearch.segments;
                }
              }
            } catch (error) {
              console.error('Ошибка чтения кэша сегментов:', error);
            }
            
            return {
              id: item["Project ID"],
              title: item["Project name"],
              createdAt: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              status: uiStatus,
              segments: cachedSegmentCount, // Используем кэшированное значение вместо 0
              progress,
              dbStatus
            };
          });
          
          setResearch(basicResearches);
          
          // Загружаем актуальные сегменты в фоне только если в кэше нет данных
          const hasAllSegmentCounts = basicResearches.every(r => r.segments > 0);
          if (!hasAllSegmentCounts) {
            loadSegmentsInBackground(basicResearches);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки исследований:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Загрузка сегментов в фоне
  const loadSegmentsInBackground = async (researches: Research[]) => {
    try {
      const updatedResearches = await Promise.all(
        researches.map(async (item) => {
          const { count: segmentCount } = await getResearchSegmentCount(item.id);
          return { ...item, segments: segmentCount };
        })
      );
      
      setResearch(updatedResearches);
      saveCacheResearches(updatedResearches);
    } catch (error) {
      console.error('Ошибка загрузки сегментов:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Сначала пытаемся загрузить из кэша
      const hasCachedData = loadCachedResearches();
      
      // Затем обновляем данные из Supabase
      loadResearches(!hasCachedData);
    }
  }, [user?.id]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  

  useEffect(() => {
    document.title = "Мои исследования | AiPetri Studio";
  }, []);

  const items = useMemo(() => {
    let list = research;
    if (filter !== "all") list = list.filter((i) => i.status === filter);
    return list;
  }, [filter, research]);

  const handleRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleRenameConfirm = async () => {
    if (editingTitle.trim() && editingId) {
      try {
        // Сохраняем в Supabase
        if (user?.id) {
          const { error } = await updateResearch(editingId, { 
            "Project name": editingTitle.trim() 
          });
          
          if (error) {
            console.error('Error updating research name:', error);
            toast({ 
              type: "error",
              title: "Ошибка сохранения",
              description: "Ошибка сохранения в базе данных" 
            });
            setEditingId(null);
            setEditingTitle("");
            return;
          }
        }
        
        // Обновляем локальное состояние
        const updatedResearch = research.map(item => 
          item.id === editingId 
            ? { ...item, title: editingTitle.trim() }
            : item
        );
        setResearch(updatedResearch);
        
        // Обновляем кэш
        saveCacheResearches(updatedResearch);
        
        toast({ 
          type: "success",
          title: "Исследование переименовано",
          description: "Название успешно обновлено"
        });
      } catch (error) {
        console.error('Error renaming research:', error);
        toast({ 
          type: "error",
          title: "Ошибка переименования",
          description: "Ошибка при переименовании" 
        });
      }
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleDuplicate = (item: Research) => {
    const newItem: Research = {
      ...item,
      id: Date.now().toString(),
      title: `${item.title} (копия)`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setResearch(prev => [newItem, ...prev]);
    toast({ 
      type: "info",
      title: "Исследование скопировано",
      description: `Создана копия: ${newItem.title}`
    });
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) {
      toast({
        type: "error",
        title: "Ошибка доступа",
        description: "Необходимо войти в систему"
      });
      return;
    }

    try {
      // Удаляем из Supabase
      const { error } = await deleteResearch(id);
      
      if (error) {
        console.error('Error deleting research from Supabase:', error);
        toast({
          type: "error",
          title: "Ошибка удаления",
          description: "Ошибка удаления исследования из базы данных"
        });
        return;
      }

      // Удаляем из localStorage
      setResearch(prev => prev.filter(item => item.id !== id));
      
      // Очищаем ВСЕ связанные данные из localStorage
      const allKeys = Object.keys(localStorage);
      const keysToRemove = allKeys.filter(key => 
        key === 'research' ||
        key === 'research-data' ||
        key.includes(id) || // Любые ключи содержащие ID исследования
        key.includes(`research-${id}`) ||
        key.includes(`selectedSegments_${id}`) ||
        key.includes(`analysis_${id}_`) ||
        key.includes(`segment-analysis-${id}-`)
      );
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Удален ключ localStorage: ${key}`);
      });
      
      // Обновляем основной массив исследований в localStorage
      const currentResearch = JSON.parse(localStorage.getItem('research') || '[]');
      const updatedResearch = currentResearch.filter((r: any) => r.id !== id);
      localStorage.setItem('research', JSON.stringify(updatedResearch));
      
      toast({ 
        type: "delete",
        title: "Исследование удалено",
        description: "Исследование и все связанные данные удалены"
      });
    } catch (error) {
      console.error('Error deleting research:', error);
      toast({
        type: "error",
        title: "Ошибка удаления",
        description: "Произошла ошибка при удалении исследования"
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === dropTargetId) {
      setDraggedItem(null);
      return;
    }

    setResearch(prev => {
      const newResearch = [...prev];
      const draggedIndex = newResearch.findIndex(item => item.id === draggedItem);
      const targetIndex = newResearch.findIndex(item => item.id === dropTargetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Удаляем элемент из старой позиции
        const [draggedElement] = newResearch.splice(draggedIndex, 1);
        // Вставляем на новую позицию
        newResearch.splice(targetIndex, 0, draggedElement);
      }
      
      return newResearch;
    });

    setDraggedItem(null);
    toast({ 
      type: "info",
      title: "Порядок изменен",
      description: "Расположение карточек обновлено"
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };


  const StatusPill = ({ status }: { status: ResearchStatus }) => {
    const map: Record<ResearchStatus, string> = {
      done: "bg-secondary text-secondary-foreground",
      draft: "bg-muted text-muted-foreground",
    };
    const label: Record<ResearchStatus, string> = {
      done: "Завершено",
      draft: "Черновик",
    };
    return <Badge className={`rounded-full px-2 py-0.5 ${map[status]}`}>{label[status]}</Badge>;
  };

  const EmptyState = () => (
    <div className="text-center border rounded-2xl p-10 bg-card shadow-elevated animate-fade-in">
      <h2 className="text-xl font-semibold mt-4">Создайте первое исследование</h2>
      <p className="text-sm text-muted-foreground mt-1">Проанализируйте вашу целевую аудиторию за 3 минуты с помощью AI</p>
      <Button onClick={() => navigate("/dashboard/research/new")} variant="hero" className="mt-6 rounded-xl text-base py-6">Начать исследование</Button>

      <div className="grid md:grid-cols-3 gap-4 mt-8 text-left">
        <Card><CardContent className="pt-6"><div className="font-medium">Загрузите данные о клиентах</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="font-medium">Или опишите идею бизнеса</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="font-medium">Получите детальный анализ</div></CardContent></Card>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "Все" },
            { key: "done", label: "Завершенные" },
            { key: "draft", label: "Черновики" },
          ].map((f) => (
            <div
              key={f.key}
              className="px-3 py-1.5 rounded-full text-sm bg-muted animate-pulse h-8 w-16"
            />
          ))}
        </div>
        <div className="text-center border rounded-2xl p-10 bg-card shadow-elevated">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка исследований...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Filters */}
      <div className="w-full grid grid-cols-3 gap-2 mb-5">
        {[
          { key: "all", label: "Все" },
          { key: "done", label: "Завершенные", shortLabel: "Готовые" },
          { key: "draft", label: "Черновики" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-2 py-2 rounded-full text-xs transition ${
              filter === f.key ? "bg-[hsl(var(--primary))] text-white" : "bg-[hsl(var(--secondary))]"
            }`}
          >
            <span className="hidden sm:inline">{f.label}</span>
            <span className="sm:hidden">{f.shortLabel || f.label}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">Мои исследования</h2>
            <div className="flex gap-2">
              <Button asChild variant="hero" className="rounded-xl w-full sm:w-auto">
                <Link to="/dashboard/research/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Новое исследование
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 ease-in-out">
            {items.map((it) => (
              <Card 
                key={it.id} 
                className={`hover-lift cursor-pointer transition-all duration-200 ${
                  draggedItem === it.id ? 'opacity-50 rotate-2 scale-105' : ''
                } ${draggedItem && draggedItem !== it.id ? 'scale-95' : ''}`}
                draggable={editingId !== it.id}
                onDragStart={(e) => handleDragStart(e, it.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, it.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  if (editingId !== it.id && !draggedItem) {
                    // Умная навигация на основе статуса из Supabase
                    const dbStatus = (it as any).dbStatus || it.status;
                    
                    if (dbStatus === 'error') {
                      // Ошибка - переходим на страницу создания с параметром восстановления
                      navigate(`/dashboard/research/new?id=${it.id}`);
                    } else if (dbStatus === 'generating' || dbStatus === 'processing') {
                      // В процессе - переходим на страницу создания исследования с загрузкой
                      navigate(`/dashboard/research/new?id=${it.id}`);
                    } else if (dbStatus === 'awaiting_selection') {
                      // Сегменты сгенерированы, нужен выбор - переходим на страницу создания
                      navigate(`/dashboard/research/new?id=${it.id}`);
                    } else {
                      // Завершено - переходим на страницу результатов
                      navigate(`/dashboard/research/${it.id}`);
                    }
                  }
                }}
              >
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-2">
                      {editingId === it.id ? (
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="h-6 text-sm font-medium"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              handleRenameConfirm();
                            } else if (e.key === 'Escape') {
                              handleRenameCancel();
                            }
                          }}
                          onBlur={handleRenameConfirm}
                        />
                      ) : (
                        <div className="font-medium line-clamp-1">{it.title}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">{new Date(it.createdAt).toLocaleDateString("ru-RU")}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded-md hover:bg-accent"><MoreVertical className="h-4 w-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleRename(it.id, it.title);
                        }}>
                          Переименовать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(it);
                        }}>
                          Дублировать
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(it.id);
                          }}
                        >
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusPill status={it.status} />
                    <div className="text-xs text-muted-foreground">Сегментов: {it.segments}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
