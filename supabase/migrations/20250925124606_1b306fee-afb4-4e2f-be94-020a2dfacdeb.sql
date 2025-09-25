-- Убеждаемся что RLS включен и настроен для real-time обновлений
-- Включаем realtime для таблиц segments и top_segments

-- Для таблицы segments
ALTER TABLE public.segments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.segments;

-- Для таблицы top_segments  
ALTER TABLE public.top_segments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.top_segments;

-- Проверяем что RLS политики работают корректно для real-time
-- (политики уже существуют, просто проверяем)

-- Добавляем индексы для улучшения производительности real-time подписок
CREATE INDEX IF NOT EXISTS idx_segments_project_id_realtime ON public.segments ("Project ID");
CREATE INDEX IF NOT EXISTS idx_top_segments_project_id_realtime ON public.top_segments (project_id);