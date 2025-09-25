import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2, Lock, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeWithAI } from "@/lib/openai-utils";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FloatingAIAssistantProps {
  analysisType?: string;
  analysisContent?: string;
  segmentName?: string;
  segmentId?: string;
  researchId?: string;
  isLocked?: boolean;
  missingAnalyses?: string[];
  context?: string;
}

export default function FloatingAIAssistant({
  analysisType,
  analysisContent,
  segmentName,
  segmentId,
  researchId,
  isLocked = false,
  missingAnalyses = [],
  context = "analysis"
}: FloatingAIAssistantProps) {
  // Компонент отключен по запросу пользователя
  return null;
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [allAnalysesContent, setAllAnalysesContent] = useState<Record<string, string>>({});
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useCustomToast();

  // Ключ для localStorage истории чата
  const getChatKey = () => {
    if (analysisType && researchId && segmentId) {
      return `ai-chat-${researchId}-${segmentId}-${analysisType}`;
    } else if (researchId && segmentId) {
      return `ai-chat-${researchId}-${segmentId}-all`;
    }
    return 'ai-chat-general';
  };

  // Загрузка истории чата из localStorage
  useEffect(() => {
    const chatKey = getChatKey();
    const savedChat = localStorage.getItem(chatKey);
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        setMessages(parsed.messages || []);
        setThreadId(parsed.threadId || null);
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }, [researchId, segmentId, analysisType]);

  // Сохранение истории чата
  useEffect(() => {
    if (messages.length > 0) {
      const chatKey = getChatKey();
      localStorage.setItem(chatKey, JSON.stringify({
        messages,
        threadId,
        updatedAt: new Date().toISOString()
      }));
    }
  }, [messages, threadId]);

  // Загрузка всех анализов для полного контекста
  useEffect(() => {
    if (!isLocked && researchId && segmentId) {
      loadAllAnalyses();
    }
  }, [isLocked, researchId, segmentId]);

  const loadAllAnalyses = async () => {
    try {
      const { data } = await supabase
        .from('segment_analyses')
        .select('analysis_type, content')
        .eq('Project ID', researchId)
        .eq('Сегмент ID', parseInt(segmentId));
      
      if (data) {
        const content: Record<string, string> = {};
        data.forEach(analysis => {
          if (analysis.content) {
            let text = '';
            if (typeof analysis.content === 'string') {
              try {
                const parsed = JSON.parse(analysis.content);
                text = parsed.text || analysis.content;
              } catch {
                text = analysis.content;
              }
            } else if (typeof analysis.content === 'object' && analysis.content !== null && 'text' in analysis.content) {
              text = (analysis.content as any).text;
            }
            content[analysis.analysis_type] = text;
          }
        });
        setAllAnalysesContent(content);
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  };

  // Скролл при новых сообщениях (только для новых)
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      // БЕЗ анимации, мгновенно
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]); // Только при изменении количества

  // При открытии чата - мгновенно вниз
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Используем requestAnimationFrame для гарантии рендера
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [isOpen]);

  // Приветственное сообщение при открытии
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeMessage = '';
      
      if (analysisType) {
        welcomeMessage = `Здравствуйте! Я помогу вам разобраться с вашим анализом "${getAnalysisTitle(analysisType)}". Задавайте вопросы по данному исследованию.`;
      } else if (context === 'segment' && segmentName) {
        welcomeMessage = `Здравствуйте! Я помогу проанализировать ваш сегмент "${segmentName}". У меня есть доступ ко всем завершенным анализам этого сегмента. Чем могу помочь?`;
      } else {
        welcomeMessage = `Здравствуйте! Я AI-консультант платформы AIPetri Studio. Помогу разобраться с вашими исследованиями целевой аудитории.`;
      }
      
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  // Функция для очистки форматирования от markdown символов
  const cleanMarkdownForDisplay = (text: string): string => {
    return text
      // Убираем звездочки для bold
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      // Убираем подчеркивания для italic
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Убираем обратные кавычки для кода
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```/g, '').trim()
      })
      .replace(/`(.*?)`/g, '$1')
      // Убираем решетки для заголовков
      .replace(/^#{1,6}\s+/gm, '')
      // Убираем горизонтальные линии
      .replace(/^---+$/gm, '')
      .replace(/^\*\*\*+$/gm, '')
      // Убираем маркеры списков
      .replace(/^[-*+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, (match, offset, string) => {
        const num = match.match(/\d+/)?.[0];
        return `${num}. `;
      })
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
    return titles[type] || 'текущего анализа';
  };

  const preprocessQuestion = (question: string): string => {
    const lowerQ = question.toLowerCase();
    
    // Добавляем контекстные подсказки для AI
    if (lowerQ.includes('начать') || lowerQ.includes('первый шаг')) {
      return question + '\n[Пользователь хочет конкретный план действий]';
    }
    if (lowerQ.includes('применить') || lowerQ.includes('использовать')) {
      return question + '\n[Пользователь ищет практическое применение]';
    }
    if (lowerQ.includes('главное') || lowerQ.includes('важное')) {
      return question + '\n[Пользователь хочет приоритезацию]';
    }
    if (lowerQ.includes('пример') || lowerQ.includes('кейс')) {
      return question + '\n[Пользователь хочет конкретные примеры]';
    }
    
    return question;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Формируем контекст в зависимости от типа чата
      let contextContent = '';
      
      if (analysisType && analysisContent) {
        // Контекст конкретного анализа
        contextContent = `
ТЕКУЩИЙ АНАЛИЗ: ${getAnalysisTitle(analysisType)}
СОДЕРЖАНИЕ:
${analysisContent.substring(0, 3000)}
`;
      } else if (context === 'segment' && Object.keys(allAnalysesContent).length > 0) {
        // Контекст всего сегмента
        contextContent = `
ДОСТУПНЫЕ АНАЛИЗЫ СЕГМЕНТА "${segmentName}":
`;
        for (const [type, content] of Object.entries(allAnalysesContent)) {
          contextContent += `
${getAnalysisTitle(type)}:
${content.substring(0, 500)}...

`;
        }
      }

      const systemPrompt = `
Ты — ведущий эксперт по стратегическому анализу целевой аудитории и маркетинговым исследованиям с 15-летним опытом. Ты работаешь консультантом на платформе AIPetri Studio.

ТВОЯ РОЛЬ:
Ты помогаешь предпринимателям и маркетологам глубоко понимать их целевую аудиторию и превращать инсайты в конкретные бизнес-решения.

${segmentName ? `📊 АНАЛИЗИРУЕМЫЙ СЕГМЕНТ: "${segmentName}"` : ''}
${analysisType ? `📌 ТЕКУЩИЙ РАЗДЕЛ: "${getAnalysisTitle(analysisType)}"` : ''}

🎯 ТВОИ КЛЮЧЕВЫЕ КОМПЕТЕНЦИИ:
• Трансформация данных в actionable insights
• Выявление скрытых паттернов и возможностей
• Создание практических стратегий на основе исследований
• Критическое мышление и валидация гипотез
• Превращение болей аудитории в точки роста бизнеса

⚡ ПРИНЦИПЫ РАБОТЫ:

1. КОНКРЕТИКА ПРЕВЫШЕ ВСЕГО
   - Никаких общих фраз типа "это важно для бизнеса"
   - Каждый совет должен быть применим здесь и сейчас
   - Приводи конкретные примеры и сценарии использования

2. СТРУКТУРИРОВАННАЯ ПОДАЧА
   - Используй нумерацию для последовательных шагов
   - Выделяй ключевые инсайты
   - Группируй информацию логически
   - Делай выводы в формате "Что это значит для вашего бизнеса"

3. КРИТИЧЕСКОЕ МЫШЛЕНИЕ
   - Указывай на потенциальные риски и ограничения
   - Предлагай альтернативные интерпретации данных
   - Задавай уточняющие вопросы для углубления анализа
   - Не соглашайся автоматически, если видишь противоречия

4. ПРАКТИЧЕСКАЯ ЦЕННОСТЬ
   - Каждый ответ должен приближать к решению бизнес-задачи
   - Предлагай конкретные тактики и инструменты
   - Давай метрики для измерения результатов
   - Показывай ROI от внедрения рекомендаций

5. ФОКУС НА РЕЗУЛЬТАТЕ
   - Что конкретно делать с этой информацией?
   - Какой первый шаг можно сделать прямо сегодня?
   - Как измерить эффективность?
   - Какие quick wins доступны?

📝 ФОРМАТ ОТВЕТОВ:

ДЛЯ ВОПРОСОВ ПО ИНТЕРПРЕТАЦИИ:
1. Ключевой инсайт (1-2 предложения)
2. Что это означает для бизнеса
3. Конкретные действия (3-5 пунктов)
4. Метрики успеха
5. Потенциальные риски

ДЛЯ СТРАТЕГИЧЕСКИХ ВОПРОСОВ:
1. Анализ текущей ситуации
2. Возможности для роста
3. Пошаговый план действий
4. Ресурсы и инструменты
5. Timeline и KPI

ДЛЯ ТАКТИЧЕСКИХ ВОПРОСОВ:
1. Прямой ответ
2. Обоснование из данных
3. Примеры применения
4. Чек-лист для внедрения

🚫 ОГРАНИЧЕНИЯ:
• НЕ отвечай на вопросы вне контекста исследования
• НЕ додумывай данные, которых нет в анализе
• НЕ давай общие советы без привязки к конкретному сегменту
• НЕ используй фразы "AIPetri Studio клиенты" - это платформа, не компания

💡 СПЕЦИАЛЬНЫЕ НАВЫКИ:

Если спрашивают "С ЧЕГО НАЧАТЬ?":
→ Дай 3 quick wins на основе самых острых болей аудитории

Если спрашивают "КАК ПРИМЕНИТЬ?":
→ Создай мини-стратегию на 30-60-90 дней

Если спрашивают "ЧТО ГЛАВНОЕ?":
→ Выдели топ-3 инсайта с потенциалом максимального ROI

Если спрашивают "КАК ПРОВЕРИТЬ?":
→ Предложи A/B тесты и эксперименты для валидации

📊 КОНТЕКСТ ИССЛЕДОВАНИЯ:
${contextContent || 'Загрузка данных анализа...'}

ПОМНИ: Твоя задача — превратить исследование в прибыль. Каждый твой ответ должен приближать пользователя к росту выручки, снижению CAC или увеличению LTV.

При ответе:
- Будь экспертом, а не помощником
- Говори уверенно, но обоснованно
- Challengь очевидное, ищи неочевидное
- Думай как предприниматель, а не как аналитик
- Фокусируйся на том, что можно сделать, а не на том, чего не хватает
`;

      // Предобработка вопроса с контекстными подсказками
      const enrichedQuestion = preprocessQuestion(input);

      // Вызываем AI с threadId
      const result = await analyzeWithAI(systemPrompt, enrichedQuestion, threadId);
      
      // Сохраняем threadId если это первое сообщение
      if (!threadId && result.threadId) {
        setThreadId(result.threadId);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLocked) {
    const getMissingAnalysesText = () => {
      if (!missingAnalyses || missingAnalyses.length === 0) {
        return "Завершите все анализы сегмента";
      }
      
      const analysisNames: Record<string, string> = {
        'segment_description': 'Описание сегмента',
        'bdf_analysis': 'BDF анализ',
        'problems_analysis': 'Боли, страхи, потребности',
        'solutions_analysis': 'Работа с болями',
        'jtbd_analysis': 'JTBD',
        'content_themes': 'Темы для контента',
        'user_personas': 'User personas',
        'niche_integration': 'Уровни интеграции',
        'final_report': 'Аналитический отчет'
      };
      
      const missing = missingAnalyses
        .map(type => analysisNames[type] || type)
        .slice(0, 3); // Показываем первые 3
      
      const moreCount = missingAnalyses.length - 3;
      
      return (
        <>
          <div>Не завершены анализы:</div>
          <div className="mt-1">• {missing.join(', ')}</div>
          {moreCount > 0 && <div>и еще {moreCount}...</div>}
        </>
      );
    };

    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative group">
          <Button
            className="rounded-full h-14 w-14 shadow-lg opacity-50 cursor-not-allowed"
            disabled
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
            <Lock className="h-3 w-3 text-white" />
          </div>
          
          {/* Подсказка при наведении */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap max-w-xs">
              <div className="font-semibold mb-1">AI-консультант заблокирован</div>
              {getMissingAnalysesText()}
              <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Плавающая кнопка */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
            >
              <MessageCircle className="h-6 w-6" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {messages.length}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Окно чата */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed z-50 ${
              isMinimized 
                ? 'bottom-6 right-6 w-80' 
                : 'bottom-6 right-6 w-96 h-[600px] sm:h-[500px]'
            }`}
          >
            <Card className="w-full h-full flex flex-col shadow-2xl">
              {/* Заголовок */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <span className="font-semibold text-sm">AI Консультант</span>
                    {analysisType && (
                      <span className="text-xs text-muted-foreground block">
                        {getAnalysisTitle(analysisType)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setMessages([]);
                      setThreadId(null);
                      const chatKey = getChatKey();
                      localStorage.removeItem(chatKey);
                      toast({
                        type: "info",
                        title: "История очищена",
                        description: "Начат новый диалог"
                      });
                    }}
                    title="Очистить историю"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Сообщения */}
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4"
                  >
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {cleanMarkdownForDisplay(message.content)}
                            </p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {message.role === 'user' && (
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-2 justify-start">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Поле ввода */}
                  <div className="p-4 border-t">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Задайте вопрос по анализу..."
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}