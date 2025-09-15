import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Users, Target, Heart, Lightbulb, AlertTriangle, Star, Loader2, Trash2, Bookmark, Brain, Clock, Eye, Wrench, Layers, ArrowLeft, RefreshCw, HelpCircle, MessageSquare, Copy, Share } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getSegmentAnalysis, deleteSegmentAnalysis, saveBookmark, getBookmarks } from "@/lib/supabase-utils";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "./PageHeader";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

interface SegmentAnalysisResultProps {
  researchId: string;
  segmentId: string;
  analysisType: string;
  onBack: () => void;
}

export default function SegmentAnalysisResult({ 
  researchId, 
  segmentId, 
  analysisType, 
  onBack 
}: SegmentAnalysisResultProps) {
  const { toast } = useCustomToast();
  const navigate = useNavigate();
  
  // Simplified parsing function
  const parseAnalysisContent = (content: any): string => {
    if (!content) return '';

    // Если content - строка, пробуем парсить как JSON
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        return parsed.text || content;
      } catch {
        return content;
      }
    }

    // Если content - объект
    if (typeof content === 'object') {
      // Проверяем OpenAI формат с text.value
      if (content.text && content.text.value) {
        return content.text.value;
      }
      
      // Проверяем новое поле analysis_result
      if (content.analysis_result) {
        if (typeof content.analysis_result === 'string') {
          return content.analysis_result;
        }
        return JSON.stringify(content.analysis_result, null, 2);
      }
      
      // Проверяем старое поле response для совместимости
      if (content.response) {
        if (typeof content.response === 'string') {
          try {
            // Парсим JSON строку
            const parsed = JSON.parse(content.response);
            // Если это строка с экранированными символами, очищаем её
            if (typeof parsed === 'string') {
              return parsed.replace(/\\n/g, '\n').replace(/\\"/g, '"');
            }
            return parsed.text || parsed;
          } catch {
            // Если не JSON, проверяем на экранированную строку
            if (content.response.startsWith('"') && content.response.endsWith('"')) {
              return content.response.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
            }
            return content.response;
          }
        }
        else if (content.response.text) {
          return content.response.text;
        }
        else {
          return JSON.stringify(content.response, null, 2);
        }
      }
      
      // Проверяем поле text напрямую
      if (content.text) {
        return content.text;
      }
      
      // Fallback - stringify объект
      return JSON.stringify(content, null, 2);
    }

    return String(content);
  };
  
  const [analysisResult, setAnalysisResult] = useState<any>(() => {
    // Сначала пробуем загрузить из localStorage для мгновенного отображения
    const storageKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.text || data;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(() => {
    // Если есть данные в localStorage, не показываем загрузку
    const storageKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
    return !localStorage.getItem(storageKey);
  });
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [bookmarkedTexts, setBookmarkedTexts] = useState<Array<{id: string, text: string, context: string}>>(() => {
    // Пробуем загрузить из localStorage для мгновенного отображения
    const cacheKey = `bookmarks-count-${researchId}-${segmentId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [segmentName, setSegmentName] = useState<string>(() => {
    // Попытка загрузить из localStorage для мгновенного отображения
    try {
      const cached = localStorage.getItem(`segment-name-${researchId}-${segmentId}`);
      return cached || "";
    } catch {
      return "";
    }
  });
  
  const [selectionPopup, setSelectionPopup] = useState<{show: boolean, x: number, y: number, text: string}>({
    show: false,
    x: 0,
    y: 0,
    text: ''
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const [regenerateComments, setRegenerateComments] = useState("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);


  useEffect(() => {
    const loadAnalysisFromSupabase = async () => {
      // Загружаем название сегмента
      const loadSegmentName = async () => {
        try {
          const { data } = await supabase
            .from('segments')
            .select('*')
            .eq('Project ID', researchId)
            .eq('Сегмент ID', parseInt(segmentId))
            .single();
          
          if (data && data['Название сегмента']) {
            setSegmentName(data['Название сегмента']);
            // Сохраняем в localStorage для быстрого показа в следующий раз
            localStorage.setItem(`segment-name-${researchId}-${segmentId}`, data['Название сегмента']);
          }
        } catch (error) {
          console.error('Error loading segment name:', error);
        }
      };

      loadSegmentName();
      
      // Не показываем загрузку если уже есть данные
      if (analysisResult) {
        setLoading(false);
      }
      
      setError(null);
      
      try {
        // Сначала показываем данные из localStorage если есть
        const storageKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData && !analysisResult) {
          try {
            const parsed = JSON.parse(savedData);
            setAnalysisResult(parsed.text || parsed);
            setLoading(false);
          } catch (e) {
            console.error('Error parsing localStorage data:', e);
          }
        }
        
        // Затем загружаем актуальные данные из Supabase в фоне
        const { data, error } = await getSegmentAnalysis(researchId, parseInt(segmentId), analysisType);
        
        if (error) {
          console.error('Error loading analysis:', error);
          setError('Ошибка загрузки анализа');
          return;
        }
        
        if (data && data.content) {
          const processedContent = parseAnalysisContent(data.content);
          
          // Сохраняем в localStorage для быстрой загрузки в будущем
          const storageKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
          localStorage.setItem(storageKey, JSON.stringify({
            text: processedContent,
            updatedAt: new Date().toISOString()
          }));
          
          setAnalysisResult(processedContent);
          setLoading(false);
        } else {
          // Fallback to localStorage for backward compatibility
          const storageKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
          const saved = localStorage.getItem(storageKey);
          
          if (saved) {
            setAnalysisResult({ text: saved });
          } else if (analysisType === 'problems_analysis') {
            // Default content for problems analysis
            setAnalysisResult({
              sections: [
                {
                  title: "Боли (Pain Points)",
                  items: [
                    "Беспокойство о безопасности и составе продуктов для детей",
                    "Сложность выбора между качеством и ценой",
                    "Страх перед потенциальными аллергенами в продуктах"
                  ],
                  summary: "Боли молодых родителей связаны с недостатком достоверной информации о продуктах"
                }
              ]
            });
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysisFromSupabase();
  }, [researchId, segmentId, analysisType]);

  // Загружаем количество закладок при монтировании
  useEffect(() => {
    // Функция выполняется асинхронно, не блокируя UI
    const loadBookmarksCount = async () => {
      try {
        const { data, error } = await getBookmarks(researchId, parseInt(segmentId));
        if (!error && data) {
          // Обновляем счетчик только когда данные загружены
          setBookmarkedTexts(data.map((b: any) => ({
            id: b.id,
            text: b.selected_text,
            context: b.analysis_type
          })));
        }
      } catch (error) {
        console.error('Error loading bookmarks:', error);
        // Не показываем ошибку пользователю, просто оставляем счетчик 0
      }
    };
    
    // Запускаем загрузку без await
    loadBookmarksCount();
  }, [researchId, segmentId]);

  const copyPageContent = async () => {
    try {
      let cleanText = '';

      if (typeof analysisResult === 'string' && analysisResult) {
        const lines = analysisResult.replace(/\\n/g, '\n').split('\n');
        const out: string[] = [];
        let i = 0;
        const pushBlank = () => {
          if (out.length && out[out.length - 1] !== '') out.push('');
        };

        // Функция для очистки markdown разметки
        const cleanMarkdown = (text: string): string => {
          return text
            .replace(/\*\*([^*]+)\*\*/g, '$1')  // Убираем жирный текст **text**
            .replace(/\*([^*]+)\*/g, '$1')     // Убираем курсив *text*
            .replace(/#{1,6}\s+/g, '')         // Убираем маркеры заголовков
            .replace(/^\s*[-*•]\s+/gm, '- ')   // Нормализуем маркеры списков
            .replace(/^\s*\d+\.\s+/gm, '- ')   // Нумерованные списки в маркированные
            .trim();
        };

        while (i < lines.length) {
          let line = lines[i].trim();
          if (!line) { pushBlank(); i++; continue; }

          // Обрабатываем заголовки
          const heading = line.match(/^#{1,6}\s+(.*)$/);
          if (heading) { 
            out.push(cleanMarkdown(heading[1])); 
            pushBlank(); 
            i++; 
            continue; 
          }

          // Обрабатываем блоки "Вывод" и "Стратегия"
          const labelMatch = line.match(/^\*\*\s*(Вывод|Стратегия|Рекомендации)[^*]*\*\*:?\s*(.*)$/i);
          if (labelMatch) {
            const label = labelMatch[1].charAt(0).toUpperCase() + labelMatch[1].slice(1).toLowerCase() + ':';
            const inlineRest = cleanMarkdown(labelMatch[2] || '').trim();
            out.push(label);
            const block: string[] = [];
            if (inlineRest) block.push(inlineRest);
            i++;
            
            // Собираем содержимое блока
            while (i < lines.length) {
              const next = lines[i].trim();
              if (!next) { 
                block.push(''); 
                i++; 
                break; 
              }
              if (/^#{1,6}\s+/.test(next) || /^\*\*[^*]+?\*\*/.test(next)) break;
              block.push(cleanMarkdown(next));
              i++;
            }
            
            if (block.length) {
              const normalized = block.map(l => {
                if (/^\d+\.\s+/.test(l)) return '- ' + l.replace(/^\d+\.\s+/, '');
                if (/^[-*•]\s+/.test(l)) return '- ' + l.replace(/^[-*•]\s+/, '');
                return l;
              }).join('\n');
              out.push(normalized.trim());
              pushBlank();
            } else {
              pushBlank();
            }
            continue;
          }

          // Обрабатываем списки
          if (/^\d+\.\s+/.test(line) || /^[-*•]\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && (/^\d+\.\s+/.test(lines[i].trim()) || /^[-*•]\s+/.test(lines[i].trim()))) {
              const t = cleanMarkdown(lines[i].trim());
              items.push(t.replace(/^\d+\.\s+/, '').replace(/^[-*•]\s+/, ''));
              i++;
            }
            items.forEach(it => out.push(`- ${it}`));
            pushBlank();
            continue;
          }

          // Обрабатываем обычные абзацы
          const para: string[] = [cleanMarkdown(line)];
          i++;
          while (i < lines.length) {
            const nxt = lines[i].trim();
            if (!nxt || /^#{1,6}\s+/.test(nxt) || /^\*\*[^*]+?\*\*/.test(nxt) || /^\d+\.\s+/.test(nxt) || /^[-*•]\s+/.test(nxt)) break;
            para.push(cleanMarkdown(nxt));
            i++;
          }
          out.push(para.join(' '));
          pushBlank();
        }
        cleanText = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      } else {
        // Fallback для случаев, когда analysisResult не строка
        const contentElement = document.querySelector('[data-analysis-content]') as HTMLElement | null;
        if (!contentElement) return;
        const raw = contentElement.innerText || contentElement.textContent || '';
        cleanText = raw.split('\n').map(l => l.trim()).filter(Boolean).join('\n\n');
      }

      await navigator.clipboard.writeText(cleanText);
      toast({
        title: "Скопировано",
        description: "Содержимое анализа скопировано с сохранением структуры",
      });
    } catch (error) {
      console.error('Error copying content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать содержимое",
      });
    }
  };

  // При обновлении bookmarkedTexts обновляем кеш
  useEffect(() => {
    const cacheKey = `bookmarks-count-${researchId}-${segmentId}`;
    localStorage.setItem(cacheKey, JSON.stringify(bookmarkedTexts));
  }, [bookmarkedTexts, researchId, segmentId]);

  // Фоновое обновление данных из Supabase
  useEffect(() => {
    // Если уже показываем данные из localStorage, обновляем их в фоне
    if (analysisResult && !loading) {
      const updateInBackground = async () => {
        try {
          const { data } = await getSegmentAnalysis(researchId, parseInt(segmentId), analysisType);
          if (data && data.content) {
            const processedContent = parseAnalysisContent(data.content);
            
            // Обновляем только если данные изменились
            if (JSON.stringify(processedContent) !== JSON.stringify(analysisResult)) {
              setAnalysisResult(processedContent);
              
              // Обновляем localStorage
              const storageKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
              localStorage.setItem(storageKey, JSON.stringify({
                text: processedContent,
                updatedAt: new Date().toISOString()
              }));
            }
          }
        } catch (error) {
          console.error('Background update error:', error);
        }
      };
      
      // Запускаем обновление через 1 секунду
      const timer = setTimeout(updateInBackground, 1000);
      return () => clearTimeout(timer);
    }
  }, [researchId, segmentId, analysisType, analysisResult, loading]);

  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (selectedText && selectedText.length > 0) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        
        if (rect) {
          setSelectionPopup({
            show: true,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            text: selectedText
          });
        }
      } else {
        setSelectionPopup(prev => ({...prev, show: false}));
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.selection-popup')) {
        setSelectionPopup(prev => ({...prev, show: false}));
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const saveToBookmarks = async () => {
    try {
      // Получаем контекст вокруг выделенного текста
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      const container = range?.commonAncestorContainer.parentElement;
      
      let contextBefore = '';
      let contextAfter = '';
      
      if (container) {
        const fullText = container.textContent || '';
        const selectedText = selectionPopup.text;
        const startIndex = fullText.indexOf(selectedText);
        
        if (startIndex !== -1) {
          // Берем 50 символов до и после для контекста
          contextBefore = fullText.substring(Math.max(0, startIndex - 50), startIndex).trim();
          contextAfter = fullText.substring(startIndex + selectedText.length, startIndex + selectedText.length + 50).trim();
        }
      }
      
      // Сохраняем в Supabase
      const { data, error } = await saveBookmark(
        researchId,
        parseInt(segmentId),
        analysisType,
        selectionPopup.text,
        contextBefore,
        contextAfter
      );
      
      if (error) {
        toast({
          type: "error",
          title: "Ошибка сохранения",
          description: "Не удалось сохранить в избранное"
        });
        return;
      }
      
      // Обновляем локальный стейт
      setBookmarkedTexts(prev => [...prev, {
        id: data.id,
        text: selectionPopup.text,
        context: getAnalysisTitle(analysisType),
        contextBefore,
        contextAfter,
        createdAt: data.created_at
      }]);
      
      toast({
        title: "Добавлено в избранное",
        description: `"${selectionPopup.text.substring(0, 50)}${selectionPopup.text.length > 50 ? '...' : ''}"`
      });
      
      setSelectionPopup(prev => ({...prev, show: false}));
      window.getSelection()?.removeAllRanges();
      
    } catch (error) {
      console.error('Error saving bookmark:', error);
      toast({
        type: "error",
        title: "Ошибка сохранения",
        description: "Произошла ошибка при сохранении"
      });
    }
  };

  const handleRegenerateWithComments = async () => {
    if (!regenerateComments.trim()) {
      toast({
        type: "error",
        title: "Ошибка",
        description: "Пожалуйста, добавьте комментарии для перегенерации"
      });
      return;
    }

    console.log('Перегенерация с комментариями:', regenerateComments);
    setLoading(true);
    setShowRegenerateDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('regenerate-with-comments', {
        body: {
          currentText: analysisResult || '',
          userComments: regenerateComments,
          segmentName: segmentName || 'Неизвестный сегмент'
        }
      });

      if (error) {
        console.error('Ошибка перегенерации:', error);
        throw new Error(error.message || 'Произошла ошибка при перегенерации');
      }

      if (data?.text) {
        // Сохраняем в базе данных
        const { error: updateError } = await supabase
          .from('segment_analyses')
          .update({
            content: data.text
          })
          .eq('Project ID', researchId)
          .eq('Сегмент ID', parseInt(segmentId))
          .eq('analysis_type', analysisType);

        if (updateError) {
          console.error('Ошибка обновления в БД:', updateError);
          throw new Error('Не удалось сохранить результат в базу данных');
        }

        // Обновляем локальное состояние
        setAnalysisResult(data.text);

        // Обновляем кэш
        const cacheKey = `segment-analysis-${researchId}-${segmentId}-${analysisType}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          text: data.text,
          updatedAt: new Date().toISOString()
        }));

        toast({
          title: "Успешно",
          description: "Анализ успешно адаптирован с учетом ваших комментариев",
        });
      } else {
        throw new Error('Не получен результат от ассистента');
      }
    } catch (error) {
      console.error('Ошибка перегенерации:', error);
      toast({
        type: "error", 
        title: "Ошибка",
        description: error instanceof Error ? error.message : 'Произошла ошибка при перегенерации'
      });
    } finally {
      setLoading(false);
      setRegenerateComments('');
    }
  };

  const handleDeleteAnalysis = async () => {
    setIsDeleting(true);
    
    try {
      // Удаляем из Supabase
      const { error } = await deleteSegmentAnalysis(researchId, parseInt(segmentId), analysisType);
      
      if (error) {
        console.error('Error deleting analysis from Supabase:', error);
        toast({
          type: "error",
          title: "Ошибка удаления",
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

      toast({
        title: "Анализ удален",
        description: `Анализ "${getAnalysisTitle(analysisType)}" успешно удален и снова доступен для выполнения.`
      });

      // Возвращаемся в меню анализа
      onBack();

    } catch (error) {
      console.error("Ошибка удаления анализа:", error);
      toast({
        type: "error",
        title: "Ошибка удаления",
        description: "Произошла ошибка при удалении анализа"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeleteAnalysis = () => {
    // Получаем список завершенных анализов для проверки зависимостей
    const storageKey = `segment-analysis-${researchId}-${segmentId}`;
    const saved = localStorage.getItem(storageKey);
    const data = saved ? JSON.parse(saved) : { completed: [] };
    const completedAnalyses = data.completed || [];

    // Нельзя удалить "Описание сегмента" если есть другие завершенные анализы
    if (analysisType === "segment_description") {
      const otherCompleted = completedAnalyses.filter((id: string) => id !== "segment_description");
      return otherCompleted.length === 0;
    }
    return true;
  };

  const getAnalysisTitle = (type: string) => {
    const titles: Record<string, string> = {
      'segment_description': 'Описание сегмента',
      'bdf_analysis': 'BDF анализ',
      'problems_analysis': 'Боли, страхи, потребности, возражения',
      'solutions_analysis': 'Работа с болями, страхами, потребностями и возражениями',
      'jtbd_analysis': 'JTBD анализ',
      'content_themes': 'Темы для контента',
      'user_personas': 'User personas',
      'niche_integration': 'Уровни интеграции с нишей',
      'final_report': 'Аналитический отчет'
    };
    return titles[type] || type;
  };


  const renderStructuredContent = (content: string) => {
    // Простое отображение с поддержкой базового markdown
    const processMarkdown = (text: string) => {
      // Восстанавливаем переносы строк
      let processed = text.replace(/\\n/g, '\n');
      
      // Разбиваем на строки
      const lines = processed.split('\n');
      const elements: JSX.Element[] = [];
      let currentList: string[] = [];
      let listType: 'numbered' | 'bullet' | null = null;
      
      const flushList = () => {
        if (currentList.length > 0) {
          if (listType === 'numbered') {
            elements.push(
              <ol key={elements.length} className="list-decimal list-inside space-y-2 my-4 pl-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-foreground/90">{item}</li>
                ))}
              </ol>
            );
          } else {
            elements.push(
              <ul key={elements.length} className="list-disc list-inside space-y-2 my-4 pl-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-foreground/90">{item}</li>
                ))}
              </ul>
            );
          }
          currentList = [];
          listType = null;
        }
      };
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Пропускаем пустые строки
        if (!trimmed) {
          flushList();
          return;
        }
        
        // Заголовок уровня 1 (#)
        if (trimmed.match(/^#\s+/)) {
          flushList();
          elements.push(
            <h1 key={index} className="text-2xl font-bold mb-4 mt-6">
              {trimmed.replace(/^#\s+/, '')}
            </h1>
          );
        }
        // Заголовок уровня 2 (##)
        else if (trimmed.match(/^##\s+/)) {
          flushList();
          elements.push(
            <h2 key={index} className="text-xl font-semibold mb-3 mt-5 text-primary">
              {trimmed.replace(/^##\s+/, '')}
            </h2>
          );
        }
        // Заголовок уровня 3 (###)
        else if (trimmed.match(/^###\s+/)) {
          flushList();
          elements.push(
            <h3 key={index} className="text-lg font-medium mb-2 mt-4">
              {trimmed.replace(/^###\s+/, '')}
            </h3>
          );
        }
        // Заголовок уровня 4 (####)
        else if (trimmed.match(/^####\s+/)) {
          flushList();
          elements.push(
            <h4 key={index} className="text-base font-medium mb-2 mt-3 text-muted-foreground">
              {trimmed.replace(/^####\s+/, '')}
            </h4>
          );
        }
        // Заголовок уровня 5 (#####) - для подкатегорий
        else if (trimmed.match(/^#####\s+/)) {
          flushList();
          elements.push(
            <h5 key={index} className="text-sm font-semibold mb-2 mt-3">
              {trimmed.replace(/^#####\s+/, '')}
            </h5>
          );
        }
        // Обработка жирного текста с выводами и стратегиями
        else if (trimmed.includes('**')) {
          flushList();
          
          // Обрабатываем строки типа **Вывод:** текст
          const boldPattern = /\*\*([^*]+)\*\*/g;
          let processedLine = trimmed;
          const parts: (string | JSX.Element)[] = [];
          let lastIndex = 0;
          let match;
          
          while ((match = boldPattern.exec(trimmed)) !== null) {
            // Добавляем текст до жирного
            if (match.index > lastIndex) {
              parts.push(trimmed.substring(lastIndex, match.index));
            }
            // Добавляем жирный текст
            parts.push(<strong key={`strategy-${index}-${match.index}`}>{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
          }
          
          // Добавляем оставшийся текст
          if (lastIndex < trimmed.length) {
            parts.push(trimmed.substring(lastIndex));
          }
          
          // Определяем тип блока
          const isStrategy = trimmed.toLowerCase().includes('стратегия');
          const isConclusion = trimmed.toLowerCase().includes('вывод');
          
          if (isStrategy || isConclusion) {
            elements.push(
              <div key={index} className={`my-4 p-4 rounded-lg border ${
                isStrategy 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="text-sm">{parts}</div>
              </div>
            );
          } else {
            elements.push(
              <p key={index} className="text-foreground/90 my-3 leading-relaxed">
                {parts}
              </p>
            );
          }
        }
        // Нумерованный список
        else if (/^\d+\.\s/.test(trimmed)) {
          if (listType !== 'numbered') {
            flushList();
            listType = 'numbered';
          }
          currentList.push(trimmed.replace(/^\d+\.\s*/, ''));
        }
        // Маркированный список
        else if (trimmed.match(/^[-*•]\s+/)) {
          if (listType !== 'bullet') {
            flushList();
            listType = 'bullet';
          }
          currentList.push(trimmed.replace(/^[-*•]\s+/, ''));
        }
        // Обычный параграф
        else {
          flushList();
          
          // Обрабатываем инлайновый жирный текст в параграфах
          if (trimmed.includes('**')) {
            const boldPattern = /\*\*([^*]+)\*\*/g;
            const parts: (string | JSX.Element)[] = [];
            let lastIndex = 0;
            let match;
            
            while ((match = boldPattern.exec(trimmed)) !== null) {
              if (match.index > lastIndex) {
                parts.push(trimmed.substring(lastIndex, match.index));
              }
              parts.push(<strong key={`bold-${index}-${match.index}`}>{match[1]}</strong>);
              lastIndex = match.index + match[0].length;
            }
            
            if (lastIndex < trimmed.length) {
              parts.push(trimmed.substring(lastIndex));
            }
            
            elements.push(
              <p key={index} className="text-foreground/90 my-3 leading-relaxed">
                {parts}
              </p>
            );
          } else {
            elements.push(
              <p key={index} className="text-foreground/90 my-3 leading-relaxed">
                {trimmed}
              </p>
            );
          }
        }
      });
      
      // Финальная очистка списка
      flushList();
      
      return elements;
    };
    
    const elements = processMarkdown(content);
    
    if (elements.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Результат анализа пока не доступен</p>
        </div>
      );
    }
    
    return <div className="prose prose-slate max-w-none">{elements}</div>;
  };

  return (
    <div className="space-y-4">
      {selectionPopup.show && (
        <div 
          className="selection-popup fixed z-50 bg-background border rounded-lg shadow-lg p-2 flex items-center gap-2"
          style={{
            left: `${selectionPopup.x}px`,
            top: `${selectionPopup.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={saveToBookmarks}
            className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
            title="Сохранить в избранное"
          >
            <Bookmark className="h-4 w-4" />
            <span>В избранное</span>
          </button>
        </div>
      )}
      
      {/* Навигация */}
      <div className="flex items-center gap-2 mb-4 pt-6 sm:pt-6 md:pt-14 lg:pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку анализов
        </Button>
      </div>

      {/* Заголовок с кнопками - фиксированная высота */}
      <div className="flex items-end justify-between min-h-[60px] mb-4">
        {segmentName ? (
          <div>
            <h1 className="text-2xl font-bold">
              {segmentName}
            </h1>
            <p className="text-muted-foreground mt-1">Подробный анализ</p>
          </div>
        ) : (
          <div></div>
        )}
        
        {/* Кнопки выравнены по нижнему краю */}
        <div className="flex gap-2 pb-1">
          <Button
            variant="outline"
            size="sm"
            onClick={copyPageContent}
            className="flex items-center gap-2 transition-all duration-200"
            title="Копировать весь текст"
          >
            <Copy className="h-4 w-4" />
            Копировать
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 transition-all duration-200"
            title="Экспорт анализа"
          >
            <FileText className="h-4 w-4" />
            Экспорт
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 transition-all duration-200"
            title="Поделиться анализом"
          >
            <Share className="h-4 w-4" />
            Поделиться
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 transition-all duration-200"
            onClick={() => {
              navigate(`/dashboard/research/${researchId}/segment/${segmentId}/bookmarks`);
            }}
          >
            <Bookmark className="h-4 w-4" />
            <span className="transition-all duration-200">
              Избранное {bookmarkedTexts.length > 0 && (
                <span className="ml-1 animate-in fade-in duration-300">
                  ({bookmarkedTexts.length})
                </span>
              )}
            </span>
          </Button>

          <div className="relative">
            <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 transition-all duration-200 hover:bg-primary/5"
                >
                  <RefreshCw className="h-4 w-4 text-orange-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Перегенерировать с комментариями</DialogTitle>
                  <DialogDescription>
                    Укажите конкретные комментарии и пожелания для улучшения анализа. 
                    Например: "Добавить больше примеров", "Сфокусироваться на возрасте 25-35", "Учесть региональную специфику" и т.д.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Textarea
                    placeholder="Введите ваши комментарии и пожелания для перегенерации анализа..."
                    value={regenerateComments}
                    onChange={(e) => setRegenerateComments(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRegenerateDialog(false);
                      setRegenerateComments("");
                    }}
                  >
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleRegenerateWithComments}
                    disabled={!regenerateComments.trim()}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Перегенерировать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Лампочка с подсказкой в углу */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center cursor-help">
                    <Lightbulb className="h-3 w-3 text-yellow-800" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Функция перегенерации с комментариями</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {canDeleteAnalysis() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Удалить анализ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить анализ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы действительно хотите удалить анализ "{getAnalysisTitle(analysisType)}"? 
                  Это действие нельзя отменить. Данные будут удалены из базы данных 
                  и локального хранилища, а анализ снова станет доступным для выполнения.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAnalysis}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Информационная плашка про избранное */}
      <div className="mb-4">
        <div className="relative bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-500/20 rounded-xl p-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-pulse"></div>
          <div className="relative flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Совет по работе с избранным
              </p>
              <p className="text-xs text-muted-foreground">
                Выделите любой текст в результатах анализа, и появится кнопка "Добавить в избранное" для сохранения важной информации
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="min-h-0">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {getAnalysisTitle(analysisType)}{segmentName && ` — ${segmentName}`}
            </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0">
          <div ref={contentRef} className="select-text" data-analysis-content>
            {loading && !analysisResult ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Загрузка результатов анализа...</p>
                </div>
              </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>{error}</p>
            </div>
          ) : analysisResult ? (
            typeof analysisResult === 'string' ? 
              renderStructuredContent(analysisResult) : 
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Неподдерживаемый формат данных</p>
              </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Результат анализа пока не доступен</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Кнопка "наверх" для длинных результатов анализа */}
      <ScrollToTop />
    </div>
  );
}