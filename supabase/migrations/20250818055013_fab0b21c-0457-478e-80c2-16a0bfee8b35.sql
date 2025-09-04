-- Создаем таблицу профилей пользователей
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT
);

-- Создаем таблицу исследований
CREATE TABLE public.researches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Project ID" TEXT NOT NULL,
  "User ID" TEXT NOT NULL,
  "Project name" TEXT NOT NULL,
  description TEXT
);

-- Создаем таблицу сегментов
CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Project ID" TEXT NOT NULL,
  "Название сегмента" TEXT NOT NULL,
  "Сегмент ID" NUMERIC NOT NULL,
  description TEXT
);

-- Создаем таблицу анализов сегментов
CREATE TABLE public.segment_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "Project ID" TEXT NOT NULL,
  "Сегмент ID" NUMERIC NOT NULL,
  "Название сегмента" TEXT,
  analysis_type TEXT NOT NULL,
  "Ответ бота" TEXT,
  content JSONB
);

-- Включаем RLS для всех таблиц
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_analyses ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политики для researches
CREATE POLICY "Users can view their own researches" ON public.researches
FOR SELECT USING ((auth.uid())::text = "User ID");

CREATE POLICY "Users can insert their own researches" ON public.researches
FOR INSERT WITH CHECK ((auth.uid())::text = "User ID");

CREATE POLICY "Users can update their own researches" ON public.researches
FOR UPDATE USING ((auth.uid())::text = "User ID");

CREATE POLICY "Users can delete their own researches" ON public.researches
FOR DELETE USING ((auth.uid())::text = "User ID");

-- Политики для segments
CREATE POLICY "Users can view segments of their researches" ON public.segments
FOR SELECT USING (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

CREATE POLICY "Users can insert segments for their researches" ON public.segments
FOR INSERT WITH CHECK (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

CREATE POLICY "Users can update segments of their researches" ON public.segments
FOR UPDATE USING (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

CREATE POLICY "Users can delete segments of their researches" ON public.segments
FOR DELETE USING (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

-- Политики для segment_analyses
CREATE POLICY "Users can view analyses of their segments" ON public.segment_analyses
FOR SELECT USING (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

CREATE POLICY "Users can insert analyses for their segments" ON public.segment_analyses
FOR INSERT WITH CHECK (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

CREATE POLICY "Users can update analyses of their segments" ON public.segment_analyses
FOR UPDATE USING (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

CREATE POLICY "Users can delete analyses of their segments" ON public.segment_analyses
FOR DELETE USING (
  "Project ID" IN (
    SELECT "Project ID" FROM public.researches WHERE "User ID" = (auth.uid())::text
  )
);

-- Включаем RLS для QA 2 (если еще не включена)
ALTER TABLE public."QA 2" ENABLE ROW LEVEL SECURITY;

-- Политики для QA 2
CREATE POLICY "Users can view their own QA 2 records" ON public."QA 2"
FOR SELECT USING ((auth.uid())::text = "User_ID");

CREATE POLICY "Users can insert their own QA 2 records" ON public."QA 2"
FOR INSERT WITH CHECK ((auth.uid())::text = "User_ID");

CREATE POLICY "Users can update their own QA 2 records" ON public."QA 2"
FOR UPDATE USING ((auth.uid())::text = "User_ID");

CREATE POLICY "Users can delete their own QA 2 records" ON public."QA 2"
FOR DELETE USING ((auth.uid())::text = "User_ID");

-- Создаем функцию для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Триггер для автоматического создания профиля при регистрации
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();