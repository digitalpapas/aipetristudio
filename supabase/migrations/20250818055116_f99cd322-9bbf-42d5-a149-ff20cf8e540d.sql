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