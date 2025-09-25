import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Folder, Lightbulb, Loader2, ArrowLeft, Bookmark, AlertCircle, Upload, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { useLocation } from "react-router-dom";
import SegmentCards from "@/components/dashboard/SegmentCards";
import { createResearch, updateResearch, migrateLocalStorageToSupabase, deleteResearch, getResearchById } from "@/lib/supabase-utils";
import { convertFilesToTextViaEdgeFunction, ConversionProgress, saveConvertedFilesToSupabase, formatFileSize, validateFileSize, getTotalFileSize, isSupportedFormat, getFormatDescription } from "@/lib/file-conversion";
import { FileConversionProgress } from "@/components/dashboard/FileConversionProgress";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ResearchNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useCustomToast();
  
  // Функция создания уведомления
  const createNotification = async (researchId: string, title: string, type: 'success' | 'error' | 'info') => {
    if (!user) return;
    
    try {
      const notificationData = {
        user_id: user.id,
        title: type === 'success' ? `Исследование "${title}" готово!` : `Ошибка в исследовании "${title}"`,
        message: type === 'success' 
          ? 'Анализ целевой аудитории завершен. Нажмите для просмотра результатов.'
          : 'Произошла ошибка при анализе. Попробуйте еще раз.',
        type,
        is_read: false,
        action_url: type === 'success' ? `/dashboard/research/${researchId}` : `/dashboard/research/new?id=${researchId}`,
        research_id: researchId
      };
      
      const { error } = await supabase
        .from('notifications')
        .insert([notificationData]);
        
      if (error) {
        console.error('Error creating notification:', error);
      } else {
        console.log('Notification created successfully for research:', researchId);
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };
  
  // Проверяем URL параметр для восстановления исследования с ошибкой
  const urlParams = new URLSearchParams(location.search);
  const recoveryId = urlParams.get('id');
  
  // Предварительная загрузка данных из кэша для мгновенного отображения
  const getCachedData = (id: string) => {
    // Сначала проверяем sessionStorage для быстрого доступа
    const sessionKey = `research_cache_${id}`;
    const sessionData = sessionStorage.getItem(sessionKey);
    if (sessionData) {
      try {
        return JSON.parse(sessionData);
      } catch (e) {
        console.error('Error parsing session cache:', e);
      }
    }
    
    // Затем проверяем localStorage как fallback
    const cachedResearch = JSON.parse(localStorage.getItem('research') || '[]')
      .find((r: any) => r.id === id);
    return cachedResearch;
  };
  
  // Инициализация состояния с предварительной загрузкой данных
  const cachedData = recoveryId ? getCachedData(recoveryId) : null;
  
  // Функция для извлечения оригинального описания
  const getOriginalDescription = (cachedData: any) => {
    if (!cachedData?.description) return "";
    
    // Если description содержит JSON с originalDescription, извлекаем его
    try {
      if (cachedData.description.startsWith('{')) {
        const parsed = JSON.parse(cachedData.description);
        return parsed.originalDescription || "";
      }
    } catch (e) {
      // Если не удалось распарсить, возвращаем как есть
    }
    
    return cachedData.description;
  };
  
  const [dataType, setDataType] = useState<"text" | "file">("text");
  const [title, setTitle] = useState(cachedData?.title || cachedData?.["Project name"] || "");
  const [idea, setIdea] = useState(getOriginalDescription(cachedData));
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [originalAnalysisData, setOriginalAnalysisData] = useState<any>(null);
  const [error, setError] = useState(cachedData?.status === 'error');
  const [currentResearchId, setCurrentResearchId] = useState(recoveryId || "");
  const [loadingRecovery, setLoadingRecovery] = useState(Boolean(recoveryId));
  
  // File conversion states
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  
  // AbortController для отмены запросов при размонтировании
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.title = "Новое исследование | AiPetri Studio";
    const desc = "Запустите исследование: опишите идею или загрузите данные.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name","description"); document.head.appendChild(m); }
    m.setAttribute("content", desc);
    let c = document.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement("link"); c.setAttribute("rel","canonical"); document.head.appendChild(c); }
    c.setAttribute("href", window.location.href);
    
    // НЕ выполняем миграцию из localStorage чтобы избежать дублирования
    // Работаем только с данными из Supabase как единственным источником правды
  }, [user?.id]);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      // Отменяем текущий запрос если компонент размонтируется
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Если мы были в состоянии loading и имели recoveryId, устанавливаем ошибку
      if (loading && recoveryId) {
        const existingResearchList = JSON.parse(localStorage.getItem('research') || '[]');
        const updatedList = existingResearchList.map((research: any) => {
          if (research.id === recoveryId && research.status === 'processing') {
            return {
              ...research,
              status: "error",
              error: "Процесс был прерван"
            };
          }
          return research;
        });
        localStorage.setItem('research', JSON.stringify(updatedList));
      }
    };
  }, [loading, recoveryId]);

  // Realtime: watch research status and auto-navigate on completion
  useEffect(() => {
    const targetId = recoveryId || currentResearchId;
    if (!targetId) return;

    const channel = supabase
      .channel(`research-progress-${targetId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'researches' },
        (payload) => {
          const newData = (payload as any).new;
          if (newData?.["Project ID"] !== targetId) return;
          const newStatus = newData?.status;
          console.log('📡 Realtime: research status update', newStatus);
          if (newStatus === 'completed') {
            navigate(`/dashboard/research/${targetId}`);
          }
        }
      )
      .subscribe((status) => console.log('📡 Realtime (new page) subscription status:', status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recoveryId, currentResearchId, navigate]);

  // Восстановление исследования из URL параметра
  useEffect(() => {
    const handleResearchRecovery = async () => {
      if (recoveryId) {
        try {
          // Сначала проверяем есть ли готовые сегменты в БД
          const checkExistingSegments = async () => {
            const { data: segments } = await supabase
              .from('segments')
              .select('*')
              .eq('Project ID', recoveryId);
            
            if (segments && segments.length > 0) {
              // Если сегменты есть, сразу показываем их с полными данными включая problems и message
              const formattedSegments = segments.map(s => ({
                id: s['Сегмент ID'],
                title: s['Название сегмента'],
                description: s.description,
                problems: (s as any).problems,    // Безопасное получение поля problems
                message: (s as any).message       // Безопасное получение поля message
              }));
              
              // Загружаем ПОЛНЫЕ данные топ-3 сегментов
              const { data: topSegmentsData } = await supabase
                .from('top_segments')
                .select('*') // Загружаем ВСЕ поля включая reasoning
                .eq('project_id', recoveryId)
                .order('rank');
              
              // Лог удален для предотвращения спама
              
              // Сразу переходим на страницу результатов
              setLoadingRecovery(false);
              setLoading(false);
              setError(false);
              navigate(`/dashboard/research/${recoveryId}`);
              return true;
            }
            return false;
          };

          // Проверяем кэш для быстрого доступа
          const getCachedSegments = () => {
            const sessionKey = `research_segments_${recoveryId}`;
            const cachedSegments = sessionStorage.getItem(sessionKey);
            
            if (cachedSegments) {
              try {
                const segments = JSON.parse(cachedSegments);
                if (segments && segments.length > 0) {
                  // Сразу переходим на страницу результатов
                  setLoadingRecovery(false);
                  setLoading(false);
                  setError(false);
                  navigate(`/dashboard/research/${recoveryId}`);
                  return;
                  setLoading(false);
                  setError(false);
                  return true;
                }
              } catch (e) {
                console.error('Error parsing cached segments:', e);
              }
            }
            return false;
          };

          // Сначала проверяем кэш, затем БД
          if (getCachedSegments() || await checkExistingSegments()) {
            return;
          }
          
          // ТЕПЕРЬ загружаем актуальные данные из Supabase
          const { data: research, error } = await getResearchById(recoveryId);
          
          if (!error && research) {
            console.log('Research found in Supabase:', research);
            
            // Кэшируем данные в sessionStorage для быстрого доступа в будущем
            const cacheData = {
              title: research["Project name"] || "",
              "Project name": research["Project name"] || "",
              description: research.description || "",
              status: research.status
            };
            sessionStorage.setItem(`research_cache_${recoveryId}`, JSON.stringify(cacheData));
            
            // Обновляем данные только если они отличаются от текущих (избегаем лишних рендеров)
            const newTitle = research["Project name"] || "";
            
            // Извлекаем оригинальное описание из JSON если нужно
            let newIdea = research.description || "";
            try {
              if (research.description && research.description.startsWith('{')) {
                const parsed = JSON.parse(research.description);
                newIdea = parsed.originalDescription || "";
              }
            } catch (e) {
              // Если не удалось распарсить, используем как есть
            }
            
            if (newTitle !== title || newIdea !== idea) {
              setTitle(newTitle);
              setIdea(newIdea);
            }
            
            setCurrentResearchId(recoveryId);
            
            // Устанавливаем состояние на основе актуального статуса из Supabase
            if (research.status === 'error') {
              setError(true);
              setLoadingRecovery(false);
              console.log('Research has error status, showing error state');
            } else if (research.status === 'generating' || research.status === 'processing') {
              // Остаемся в loadingRecovery для продолжающихся процессов
              setError(false);
              console.log('Research is processing, staying in recovery state');
            } else if (research.status === 'awaiting_selection' && research.generated_segments) {
              // Сразу устанавливаем результаты БЕЗ loadingRecovery
              let topSegments = [];
              
              // Пытаемся извлечь топ-3 из description
              try {
                if (research.description && research.description.startsWith('{')) {
                  const descriptionData = JSON.parse(research.description);
                  topSegments = descriptionData.topSegments || [];
                }
              } catch (e) {
                console.warn('Could not parse description for top segments:', e);
              }
              
              // Кэшируем сегменты для быстрого доступа
              sessionStorage.setItem(
                `research_segments_${recoveryId}`,
                JSON.stringify(research.generated_segments)
              );
              
              // ВАЖНО: Сразу выключаем загрузку и переходим на страницу результатов
              setLoadingRecovery(false);
              setLoading(false);
              setError(false);
              navigate(`/dashboard/research/${recoveryId}`);
              return;
            } else if (research.status === 'completed') {
              setError(false);
              console.log('Research is completed, redirecting to results');
              // Для завершенных исследований перенаправляем на страницу результатов
              navigate(`/dashboard/research/${recoveryId}`);
              return;
            } else {
              // Для других статусов (например, 'pending') показываем форму
              setLoadingRecovery(false);
              setError(false);
            }
          } else {
            // Исследование не найдено в Supabase, проверяем localStorage как fallback
            console.log('Research not found in Supabase, checking localStorage');
            const cachedResearch = JSON.parse(localStorage.getItem('research') || '[]')
              .find((r: any) => r.id === recoveryId);
            
            if (cachedResearch) {
              console.log('Research found in localStorage:', cachedResearch);
              
              // Обновляем данные только если они отличаются
              const newTitle = cachedResearch.title || "";
              
              // Извлекаем оригинальное описание из JSON если нужно
              let newIdea = cachedResearch.description || "";
              try {
                if (cachedResearch.description && cachedResearch.description.startsWith('{')) {
                  const parsed = JSON.parse(cachedResearch.description);
                  newIdea = parsed.originalDescription || "";
                }
              } catch (e) {
                // Если не удалось распарсить, используем как есть
              }
              
              if (newTitle !== title || newIdea !== idea) {
                setTitle(newTitle);
                setIdea(newIdea);
              }
              
              setCurrentResearchId(recoveryId);
              
              if (cachedResearch.status === 'error') {
                setError(true);
                setLoadingRecovery(false);
              } else if (cachedResearch.status === 'generating' || cachedResearch.status === 'processing') {
                // Остаемся в loadingRecovery для продолжающихся процессов
                setError(false);
              } else {
                // Для других статусов показываем форму
                setLoadingRecovery(false);
                setError(false);
              }
            } else {
              // Исследование не найдено нигде
              console.error('Research not found anywhere:', recoveryId);
              toast({
                type: "error",
                title: "Исследование не найдено",
                description: "Данное исследование не существует"
              });
              navigate('/dashboard');
              return;
            }
          }
        } catch (error) {
          console.error('Error loading research:', error);
          toast({
            type: "error",
            title: "Ошибка загрузки",
            description: "Не удалось загрузить данные исследования"
          });
          navigate('/dashboard');
        }
      }
    };

    handleResearchRecovery();
  }, [recoveryId, navigate, toast, user?.id]);

  const getFileTypeInfo = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Документы
    if (['txt', 'rtf', 'odt', 'md', 'markdown'].includes(extension)) {
      return { icon: '📄', type: 'Текстовый документ' };
    }
    if (['pdf'].includes(extension)) {
      return { icon: '📄', type: 'PDF документ' };
    }
    if (['doc', 'docx'].includes(extension)) {
      return { icon: '📄', type: 'Word документ' };
    }
    
    // Таблицы
    if (['xls', 'xlsx'].includes(extension)) {
      return { icon: '📊', type: 'Excel таблица' };
    }
    if (['csv', 'ods'].includes(extension)) {
      return { icon: '📊', type: 'Таблица' };
    }
    
    // Презентации
    if (['ppt', 'pptx'].includes(extension)) {
      return { icon: '📊', type: 'Презентация' };
    }
    
    // Изображения
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(extension)) {
      return { icon: '📷', type: 'Изображение' };
    }
    
    // Веб и книги
    if (['html', 'htm'].includes(extension)) {
      return { icon: '🌐', type: 'HTML документ' };
    }
    if (['epub', 'mobi'].includes(extension)) {
      return { icon: '📚', type: 'Электронная книга' };
    }
    
    return { icon: '📄', type: 'Документ' };
  };

  const validateFiles = (files: File[]) => {
    const allowedExtensions = [
      // Документы
      'txt', 'pdf', 'doc', 'docx', 'rtf', 'odt',
      // Таблицы  
      'xls', 'xlsx', 'csv', 'ods',
      // Презентации
      'ppt', 'pptx',
      // Изображения (для OCR)
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff',
      // Веб и книги
      'html', 'htm', 'epub', 'mobi',
      // Разметка
      'md', 'markdown'
    ];
    
    const maxFileSize = 20 * 1024 * 1024; // 20 МБ
    const maxTotalSize = 50 * 1024 * 1024; // 50 МБ
    
    let totalSize = 0;
    
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!allowedExtensions.includes(extension)) {
        toast({
          type: "error",
          title: "Неподдерживаемый формат",
          description: `Файл ${file.name} имеет неподдерживаемый формат. Поддерживаемые форматы: PDF, Word, Excel, TXT, RTF, HTML, изображения с текстом`
        });
        return false;
      }
      
      if (file.size > maxFileSize) {
        toast({
          type: "error",
          title: "Файл слишком большой",
          description: `Файл ${file.name} превышает лимит 20 МБ`
        });
        return false;
      }
      
      totalSize += file.size;
    }
    
    if (totalSize > maxTotalSize) {
      toast({
        type: "error",
        title: "Превышен общий размер",
        description: "Общий размер всех файлов не должен превышать 50 МБ"
      });
      return false;
    }
    
    return true;
  };

  // Функция проверки файлов для конвертации CloudConvert
  const validateFilesForConversion = (files: File[]) => {
    // Check file formats
    const unsupportedFiles = files.filter(file => !isSupportedFormat(file));
    if (unsupportedFiles.length > 0) {
      const fileNames = unsupportedFiles.map(f => f.name).join(', ');
      toast({
        type: "error",
        title: "Неподдерживаемые форматы",
        description: `Файлы не поддерживаются: ${fileNames}`
      });
      return false;
    }
    
    // Check file sizes individually
    for (const file of files) {
      const validation = validateFileSize(file);
      if (!validation.valid) {
        toast({
          type: "error",
          title: "Файл слишком большой",
          description: validation.error
        });
        return false;
      }
    }
    
    // Check total size
    const totalSize = getTotalFileSize(files);
    const maxTotalSize = 500 * 1024 * 1024; // 500MB total
    if (totalSize > maxTotalSize) {
      toast({
        type: "error",
        title: "Общий размер файлов слишком большой",
        description: "Общий размер всех файлов не должен превышать 500MB"
      });
      return false;
    }
    
    return true;
  };

  // Функция удалена - больше не используется webhook

  const start = async () => {
    // Защита от повторных вызовов
    if (loading) {
      console.log("Research creation already in progress, ignoring duplicate call");
      return;
    }

    // Генерируем ID исследования в начале функции
    const researchId = Date.now().toString();
    console.log("Starting research creation with ID:", researchId);
    
    if (!user) {
      toast({
        type: "error",
        title: "Ошибка авторизации",
        description: "Пользователь не авторизован"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        type: "warning",
        title: "Заполните название",
        description: "Введите название исследования"
      });
      return;
    }

    if (dataType === "text" && idea.length < 100) {
      toast({
        type: "warning",
        title: "Недостаточно текста",
        description: "Описание проекта должно содержать минимум 100 символов"
      });
      return;
    }

    if (dataType === "file" && files.length === 0) {
      toast({
        type: "warning",
        title: "Загрузите файлы",
        description: "Загрузите хотя бы один файл"
      });
      return;
    }

    if (dataType === "file" && !validateFilesForConversion(files)) {
      return;
    }

    setLoading(true);

    try {
      const description = dataType === "text" ? idea : `${files.length} файл(ов)`;
      
      // Создаем исследование в Supabase
      const { data: research, error: createError } = await createResearch(
        researchId,
        user.id,
        title,
        description
      );

      if (createError) {
        console.error('Error creating research:', createError);
        toast({
          type: "error",
          title: "Ошибка создания",
          description: "Ошибка создания исследования"
        });
        return;
      }

      // Создаем карточку исследования сразу со статусом "generating"
      const newResearch = {
        id: researchId,
        title: title,
        createdAt: new Date().toISOString(),
        status: "generating",
        segmentsCount: 0,
        description: description,
        type: dataType,
        generatedSegments: null
      };

      // НЕ сохраняем в localStorage - работаем только с Supabase
      // Сохраняем ID текущего исследования для отслеживания
      setCurrentResearchId(researchId);
      
      let requestBody: any = {
        user_id: user.id,
        research_id: researchId,
        analysis_type: "initial_research",
        status: 'pending',
        userEmail: user.email,
        projectName: title,
        timestamp: new Date().toISOString()
      };

      let response;

      if (dataType === "text") {
        // Используем прямой вызов агентов для режима "У меня есть идея"
        console.log("Starting direct analysis...");
        
        const { data, error } = await supabase.functions.invoke('direct-segment-analysis', {
          body: {
            projectName: title.trim(),
            description: idea.trim(),
            userId: user.id,
            projectId: researchId
          }
        });

        if (error) {
          console.error("Supabase function error:", error);
          throw error;
        }

        if (data.success) {
          console.log("Analysis response data:", data);
          
          // Данные уже распарсены в Edge Function, используем напрямую
          const processedSegments = data.segments || [];
          
          // Проверяем что получили валидные сегменты
          if (!processedSegments || !Array.isArray(processedSegments) || processedSegments.length === 0) {
            console.warn("No segments received from analysis:", data);
            throw new Error("Анализ не смог выделить сегменты из предоставленных данных. Убедитесь что текст содержит достаточно информации о целевой аудитории.");
          }
          
          // Сохраняем данные для перегенерации
          const originalData = {
            projectName: title.trim(),
            description: idea.trim(),
            userId: user.id,
            projectId: researchId
          };
          setOriginalAnalysisData(originalData);
          
          // Создаем уведомление об успешном завершении
          await createNotification(researchId, title, 'success');
          
          // Обновляем статус исследования до 'completed' для корректного показа результатов
          await supabase
            .from('researches')
            .update({ 
              status: 'completed',
              "segmentsCount": processedSegments.length
            })
            .eq('Project ID', researchId);
          
          setLoading(false);
          
          // Сразу переходим на страницу результатов вместо показа промежуточной страницы
          navigate(`/dashboard/research/${researchId}`);
          return;
        } else {
          throw new Error(data.error || "Неизвестная ошибка");
        }
      } else if (dataType === "file") {
        // Process file conversion first
        console.log("Starting file conversion...");
        setIsConverting(true);
        
        // Call edge function for conversion with proper researchId
        const conversionResult = await convertFilesToTextViaEdgeFunction(files, researchId, setConversionProgress);
        
        if (!conversionResult.success) {
          throw new Error(conversionResult.error || "Ошибка конвертации файлов");
        }
        
        if (!conversionResult.data || conversionResult.data.length === 0) {
          throw new Error("Не удалось конвертировать ни один файл");
        }
        
        // Edge function already saves files to database, so we just combine text content
        const combinedText = conversionResult.data
          .map(file => `Файл: ${file.filename}\n\n${file.content}`)
          .join('\n\n---\n\n');
        
        console.log('Combined text length:', combinedText.length);
        console.log('Number of files processed:', conversionResult.data.length);
        console.log('Files processed:', conversionResult.data.map(f => f.filename).join(', '));
        
        setIsConverting(false);
        
        // Теперь используем ту же логику что и для текста - через direct-segment-analysis
        console.log("Starting analysis with converted text...");
        
        const { data, error } = await supabase.functions.invoke('direct-segment-analysis', {
          body: {
            projectName: title.trim(),
            description: combinedText,
            userId: user.id,
            projectId: researchId
          }
        });

        if (error) {
          console.error("Supabase function error:", error);
          throw error;
        }

        if (data.success) {
          console.log("Analysis response data:", data);
          console.log('Analysis returned segments:', data.segments?.length);
          console.log('Top segments:', data.topSegments);
          console.log('RAW DATA from FILE Edge Function:', data);
          
          // Данные уже распарсены в Edge Function, используем напрямую
          const processedSegments = data.segments || [];
          
          // Проверяем что получили валидные сегменты
          if (!processedSegments || !Array.isArray(processedSegments) || processedSegments.length === 0) {
            console.warn("No segments received from analysis:", data);
            throw new Error("Анализ не смог выделить сегменты из предоставленных данных. Убедитесь что данные содержат достаточно информации о целевой аудитории.");
          }
          
          // Сохраняем данные для перегенерации
          const originalData = {
            projectName: title.trim(),
            description: combinedText,
            userId: user.id,
            projectId: researchId
          };
          setOriginalAnalysisData(originalData);
          
          // Кэшируем сегменты для быстрого доступа при возвращении
          sessionStorage.setItem(
            `research_segments_${researchId}`,
            JSON.stringify(processedSegments)
          );
          
          // Кэшируем топ-сегменты отдельно для восстановления
          if (data.topSegmentsData && data.topSegmentsData.length > 0) {
            sessionStorage.setItem(
              `research_top_segments_${researchId}`,
              JSON.stringify(data.topSegmentsData)
            );
          }
          
          // Создаем уведомление об успешном завершении
          await createNotification(researchId, title, 'success');
          
          // Обновляем статус исследования до 'completed' для корректного показа результатов
          await supabase
            .from('researches')
            .update({ 
              status: 'completed',
              "segmentsCount": processedSegments.length
            })
            .eq('Project ID', researchId);
          
          setLoading(false);
          
          // Сразу переходим на страницу результатов вместо показа промежуточной страницы
          navigate(`/dashboard/research/${researchId}`);
          return;
        } else {
          throw new Error(data.error || "Неизвестная ошибка");
        }
      }
    } catch (error) {
      console.error("Error in research creation:", error);
      let errorMessage = "Произошла неизвестная ошибка";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        type: "error",
        title: "Ошибка создания исследования",
        description: errorMessage
      });
      
      // Update research with error status
      if (currentResearchId) {
        setError(true);
        
        // Создаем уведомление об ошибке
        await createNotification(currentResearchId, title, 'error');
        
        updateResearch(currentResearchId, {
          status: "error",
          description: `${title} - Error: ${errorMessage}`
        });
      }
    } finally {
      setLoading(false);
      setIsConverting(false);
    }
  };


  const handleRetryAnalysis = async () => {
    if (!currentResearchId || !user) return;
    
    // Создаем новый AbortController для этого запроса
    abortControllerRef.current = new AbortController();
    
    setError(false);
    setLoading(true);
    
    try {
      // Обновляем статус в Supabase
      await updateResearch(currentResearchId, { 
        description: dataType === "text" ? idea : `${files.length} файл(ов)` 
      });
      
      // Обновляем статус в localStorage
      const existingResearchList = JSON.parse(localStorage.getItem('research') || '[]');
      const updatedResearchList = existingResearchList.map((research: any) => {
        if (research.id === currentResearchId) {
          return {
            ...research,
            status: "processing"
          };
        }
        return research;
      });
      localStorage.setItem('research', JSON.stringify(updatedResearchList));
      
      let requestBody: any = {
        userId: user.id,
        userEmail: user.email,
        projectName: title,
        timestamp: new Date().toISOString(),
        researchId: currentResearchId
      };

      let response;

      if (dataType === "text") {
        // Используем прямой вызов агентов для режима "У меня есть идея"
        console.log("Starting retry with direct analysis...");
        
        const { data, error } = await supabase.functions.invoke('direct-segment-analysis', {
          body: {
            projectName: title.trim(),
            description: idea.trim(),
            userId: user.id,
            projectId: currentResearchId
          }
        });

        if (error) {
          console.error("Supabase function error:", error);
          throw error;
        }

        if (!data.success) {
          throw new Error(data.error || "Неизвестная ошибка");
        }

        // Возвращаем результат в том же формате
        response = {
          ok: true,
          async json() { return data; }
        };
      } else {
        // Для файлового режима пока оставляем старую логику
        // TODO: создать Edge Function для обработки файлов
        throw new Error("Загрузка файлов временно недоступна. Пожалуйста, используйте текстовый режим.");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Обновляем исследование в Supabase
      const description = dataType === "text" ? idea : `${files.length} файл(ов)`;
      await updateResearch(currentResearchId, { 
        description: `${description} - Completed with segments` 
      });
      
      // Обновляем localStorage при успехе
      const finalResearchList = JSON.parse(localStorage.getItem('research') || '[]');
      const finalUpdatedList = finalResearchList.map((research: any) => {
        if (research.id === currentResearchId) {
          return {
            ...research,
            status: "completed",
            generatedSegments: result
          };
        }
        return research;
      });
      localStorage.setItem('research', JSON.stringify(finalUpdatedList));

      // Перенаправляем на страницу исследования при успехе
      navigate(`/dashboard/research/${currentResearchId}`);
      
      toast({
        type: "success",
        title: "Анализ завершен",
        description: "Повторная попытка успешна"
      });
    } catch (error) {
      console.error("Retry error:", error);
      
      // Проверяем, был ли запрос отменен
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Request was aborted");
        // При отмене запроса устанавливаем статус ошибки в localStorage
        const existingResearchList = JSON.parse(localStorage.getItem('research') || '[]');
        const updatedList = existingResearchList.map((research: any) => {
          if (research.id === currentResearchId) {
            return {
              ...research,
              status: "error",
              error: "Процесс был прерван"
            };
          }
          return research;
        });
        localStorage.setItem('research', JSON.stringify(updatedList));
        setError(true);
        return;
      }
      
      setError(true);
      
      // Обновляем localStorage при ошибке
      const existingResearchList = JSON.parse(localStorage.getItem('research') || '[]');
      const updatedList = existingResearchList.map((research: any) => {
        if (research.id === currentResearchId) {
          return {
            ...research,
            status: "error",
            error: "Повторная попытка не удалась"
          };
        }
        return research;
      });
      localStorage.setItem('research', JSON.stringify(updatedList));
      
      toast({
        type: "error",
        title: "Повторная попытка не удалась",
        description: "Попробуйте еще раз позже"
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteResearch = async () => {
    if (!currentResearchId || !user) return;
    
    try {
      // Удаляем из Supabase
      await deleteResearch(currentResearchId);
      
      // Удаляем из localStorage
      const existingResearchList = JSON.parse(localStorage.getItem('research') || '[]');
      const updatedList = existingResearchList.filter((research: any) => research.id !== currentResearchId);
      localStorage.setItem('research', JSON.stringify(updatedList));
      
      toast({
        type: "delete",
        title: "Исследование удалено",
        description: "Данные успешно удалены"
      });
      
      // Возвращаемся в дашборд
      navigate('/dashboard');
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        type: "error",
        title: "Ошибка удаления",
        description: "Не удалось удалить исследование"
      });
    }
  };

  // Определяем текущее состояние для четкого разделения (приоритет: ошибка > загрузка)
  const currentState = 
    error ? 'error' : 
    loadingRecovery ? 'loading-recovery' : 
    loading ? 'loading' : 
    'form';

  return (
    <main className="space-y-5">
      <header className="sr-only"><h1>Новое исследование</h1></header>

      {/* Единая форма для создания исследования */}
      {currentState === "form" && (
        <section className="space-y-4">
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
          
          <div className="bg-card rounded-2xl border p-6 space-y-6">
            <h2 className="text-xl font-semibold">Основная информация</h2>
            
            {/* Название проекта */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Название проекта <span className="text-destructive">*</span></label>
              <Input 
                value={title} 
                onChange={async (e) => {
                  const newTitle = e.target.value;
                  setTitle(newTitle);
                  
                  // Автосохранение в Supabase если исследование уже создано
                  if (currentResearchId && user) {
                    try {
                      await updateResearch(currentResearchId, { 
                        "Project name": newTitle 
                      });
                      
                      // Обновляем localStorage
                      const existingResearch = JSON.parse(localStorage.getItem('research') || '[]');
                      const updatedResearch = existingResearch.map((research: any) => {
                        if (research.id === currentResearchId) {
                          return { ...research, title: newTitle };
                        }
                        return research;
                      });
                      localStorage.setItem('research', JSON.stringify(updatedResearch));
                    } catch (error) {
                      console.error('Error updating research title:', error);
                    }
                  }
                }}
                placeholder="Введите название вашего проекта..." 
                className="w-full" 
              />
            </div>

            {/* Радиокнопки для выбора типа данных */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Тип данных</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="dataType"
                    value="text"
                    checked={dataType === "text"}
                    onChange={(e) => setDataType(e.target.value as "text" | "file")}
                    className="w-4 h-4 text-primary border-border focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">Описать проект текстом</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="dataType"
                    value="file"
                    checked={dataType === "file"}
                    onChange={(e) => setDataType(e.target.value as "text" | "file")}
                    className="w-4 h-4 text-primary border-border focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">Загрузить файл с данными</span>
                </label>
              </div>
            </div>

            {/* Поле описания проекта (показывается только для текстового типа) */}
            {dataType === "text" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  <span className="inline-block">Опишите ваш проект <span className="text-xs text-muted-foreground">(минимум 100 символов)</span></span>
                  <span className="text-destructive ml-1">*</span>
                </label>
                <Textarea 
                  value={idea} 
                  onChange={(e) => setIdea(e.target.value)} 
                  rows={6} 
                  placeholder="Опишите ваш проект, продукт или услугу подробно..." 
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  {idea.length}/100 символов
                </div>
              </div>
            )}

            {/* Загрузка файлов (показывается только для файлового типа) */}
            {dataType === "file" && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Загрузите файлы с данными</label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/50">
                  <Input 
                    type="file" 
                    multiple 
                    accept=".txt,.pdf,.doc,.docx,.rtf,.odt,.xls,.xlsx,.csv,.ods,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.html,.htm,.epub,.mobi,.md"
                    onChange={(e)=> {
                      const newFiles = Array.from(e.target.files||[]);
                      if (files.length + newFiles.length > 5) {
                        toast({
                          type: "warning",
                          title: "Превышен лимит файлов",
                          description: "Можно загрузить максимум 5 файлов"
                        });
                        return;
                      }
                      if (validateFilesForConversion(newFiles)) {
                        setFiles([...files, ...newFiles]);
                      }
                      // Сбрасываем input для возможности повторного выбора
                      e.target.value = '';
                    }} 
                    className="w-full"
                  />
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>Поддерживаемые форматы: PDF, Word, Excel, PowerPoint, TXT, изображения с текстом, HTML, Markdown</p>
                    <p>Максимум 100 МБ на файл, до 5 файлов, общий размер до 500 МБ</p>
                  </div>
                </div>
                
                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Загруженные файлы ({files.length}/5):</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setFiles([])}
                        className="text-xs"
                      >
                        Очистить все
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {files.map((file, index) => {
                         const { icon, type } = getFileTypeInfo(file);
                         const formatDescription = getFormatDescription(file);
                         return (
                           <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 p-3 bg-background rounded-lg border">
                             <div className="flex items-center gap-3 flex-1">
                               <span className="text-lg">{icon}</span>
                               <div className="flex-1 min-w-0">
                                 <div className="text-sm font-medium truncate" title={file.name}>
                                   {file.name}
                                 </div>
                                 <div className="text-xs text-muted-foreground">
                                   {formatDescription} • {formatFileSize(file.size)}
                                 </div>
                               </div>
                             </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                const newFiles = files.filter((_, i) => i !== index);
                                setFiles(newFiles);
                              }}
                              className="text-xs text-destructive hover:text-destructive"
                            >
                              Удалить
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Кнопка запуска */}
            <Button 
              onClick={start} 
              variant="default" 
              size="lg"
              className="w-full rounded-xl" 
              disabled={loading}
            >
              Начать анализ
            </Button>
          </div>
        </section>
      )}

      {/* Состояние загрузки восстановления */}
      {currentState === 'loading-recovery' && (
        <section className="space-y-4">
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
          
          <header className="flex items-center justify-between gap-2">
            <Input value={title} readOnly className="flex-1 min-w-0" />
            <div className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">{new Date().toLocaleDateString("ru-RU")}</div>
          </header>
          
          <Card className="rounded-2xl">
            <CardContent className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <h3 className="font-semibold mb-2">
                Анализируем данные...
              </h3>
              <p className="text-muted-foreground">
                Это может занять несколько минут
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Состояние загрузки */}
      {currentState === 'loading' && (
        <section className="space-y-4">
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
          
          <header className="flex items-center justify-between gap-2">
            <Input value={title} readOnly className="flex-1 min-w-0" />
            <div className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">{new Date().toLocaleDateString("ru-RU")}</div>
          </header>
          
          <Card className="rounded-2xl">
            <CardContent className="py-8">
              {isConverting && conversionProgress.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
                    <h3 className="font-semibold mb-2">
                      Конвертируем файлы...
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Преобразуем загруженные файлы в текстовый формат
                    </p>
                  </div>
                  
                  <FileConversionProgress 
                    progress={conversionProgress}
                    onCancel={() => {
                      setLoading(false);
                      setIsConverting(false);
                      setConversionProgress([]);
                    }}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                  <h3 className="font-semibold mb-2">
                    Анализируем данные...
                  </h3>
                  <p className="text-muted-foreground">
                    Это может занять несколько минут
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Состояние ошибки */}
      {currentState === 'error' && (
        <section className="space-y-4">
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
          
          <header className="flex items-center justify-between gap-2 mb-4">
            <Input 
              value={title} 
              onChange={(e) => {
                setTitle(e.target.value);
                // Auto-save title when changed in error state
                if (currentResearchId && user) {
                  const existingResearchList = JSON.parse(localStorage.getItem('research') || '[]');
                  const updatedResearchList = existingResearchList.map((research: any) => {
                    if (research.id === currentResearchId) {
                      return { ...research, title: e.target.value };
                    }
                    return research;
                  });
                  localStorage.setItem('research', JSON.stringify(updatedResearchList));
                  
                  // Also update in Supabase
                  updateResearch(currentResearchId, { "Project name": e.target.value });
                }
              }}
              disabled={false}
              placeholder="Название исследования" 
              className="flex-1 min-w-0" 
            />
            <div className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">{new Date().toLocaleDateString("ru-RU")}</div>
          </header>
          
          <Card className="rounded-2xl border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-grow space-y-4">
                  <div>
                    <h3 className="font-semibold text-destructive">Ошибка генерации</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Произошла ошибка при обработке данных. Попробуйте еще раз или удалите исследование.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleRetryAnalysis}
                      disabled={loading}
                      className="rounded-xl"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Повторная попытка...
                        </>
                      ) : (
                        "Попробовать еще раз"
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          disabled={loading}
                          className="rounded-xl"
                        >
                          Удалить исследование
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить это исследование? Это действие нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteResearch}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
