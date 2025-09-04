-- Добавляем поле для отметки выбранных сегментов
ALTER TABLE public.segments 
ADD COLUMN is_selected BOOLEAN DEFAULT FALSE;