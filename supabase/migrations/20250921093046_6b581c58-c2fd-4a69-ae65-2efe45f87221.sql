-- Check and enable RLS on all tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.converted_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FileStorage" ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS text AS $$
  SELECT auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_owns_research(research_project_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.researches 
    WHERE "Project ID" = research_project_id 
    AND "User ID" = auth.uid()::text
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Researches policies
DROP POLICY IF EXISTS "Users can insert their own researches" ON public.researches;
DROP POLICY IF EXISTS "Users can update their own researches" ON public.researches;
DROP POLICY IF EXISTS "Users can view their own researches" ON public.researches;
DROP POLICY IF EXISTS "Users can delete their own researches" ON public.researches;

CREATE POLICY "Users can insert their own researches" ON public.researches
  FOR INSERT WITH CHECK (auth.uid()::text = "User ID");

CREATE POLICY "Users can update their own researches" ON public.researches
  FOR UPDATE USING (auth.uid()::text = "User ID");

CREATE POLICY "Users can view their own researches" ON public.researches
  FOR SELECT USING (auth.uid()::text = "User ID");

CREATE POLICY "Users can delete their own researches" ON public.researches
  FOR DELETE USING (auth.uid()::text = "User ID");

-- Segments policies
DROP POLICY IF EXISTS "Users can insert segments for their researches" ON public.segments;
DROP POLICY IF EXISTS "Users can update segments of their researches" ON public.segments;
DROP POLICY IF EXISTS "Users can view segments of their researches" ON public.segments;
DROP POLICY IF EXISTS "Users can delete segments of their researches" ON public.segments;

CREATE POLICY "Users can insert segments for their researches" ON public.segments
  FOR INSERT WITH CHECK (public.user_owns_research("Project ID"));

CREATE POLICY "Users can update segments of their researches" ON public.segments
  FOR UPDATE USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can view segments of their researches" ON public.segments
  FOR SELECT USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can delete segments of their researches" ON public.segments
  FOR DELETE USING (public.user_owns_research("Project ID"));

-- Segment analyses policies
DROP POLICY IF EXISTS "Users can insert analyses for their segments" ON public.segment_analyses;
DROP POLICY IF EXISTS "Users can update analyses of their segments" ON public.segment_analyses;
DROP POLICY IF EXISTS "Users can view analyses of their segments" ON public.segment_analyses;
DROP POLICY IF EXISTS "Users can delete analyses of their segments" ON public.segment_analyses;

CREATE POLICY "Users can insert analyses for their segments" ON public.segment_analyses
  FOR INSERT WITH CHECK (public.user_owns_research("Project ID"));

CREATE POLICY "Users can update analyses of their segments" ON public.segment_analyses
  FOR UPDATE USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can view analyses of their segments" ON public.segment_analyses
  FOR SELECT USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can delete analyses of their segments" ON public.segment_analyses
  FOR DELETE USING (public.user_owns_research("Project ID"));

-- Top segments policies
DROP POLICY IF EXISTS "Users can insert top segments for their researches" ON public.top_segments;
DROP POLICY IF EXISTS "Users can update top segments of their researches" ON public.top_segments;
DROP POLICY IF EXISTS "Users can view top segments of their researches" ON public.top_segments;
DROP POLICY IF EXISTS "Users can delete top segments of their researches" ON public.top_segments;

CREATE POLICY "Users can insert top segments for their researches" ON public.top_segments
  FOR INSERT WITH CHECK (public.user_owns_research(project_id));

CREATE POLICY "Users can update top segments of their researches" ON public.top_segments
  FOR UPDATE USING (public.user_owns_research(project_id));

CREATE POLICY "Users can view top segments of their researches" ON public.top_segments
  FOR SELECT USING (public.user_owns_research(project_id));

CREATE POLICY "Users can delete top segments of their researches" ON public.top_segments
  FOR DELETE USING (public.user_owns_research(project_id));

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can only create notifications for themselves" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only create notifications for themselves" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Bookmarks policies
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can create own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks" ON public.bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Converted files policies
DROP POLICY IF EXISTS "Users can insert their own converted files" ON public.converted_files;
DROP POLICY IF EXISTS "Users can view their own converted files" ON public.converted_files;
DROP POLICY IF EXISTS "Users can update their own converted files" ON public.converted_files;
DROP POLICY IF EXISTS "Users can delete their own converted files" ON public.converted_files;

CREATE POLICY "Users can insert their own converted files" ON public.converted_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own converted files" ON public.converted_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own converted files" ON public.converted_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own converted files" ON public.converted_files
  FOR DELETE USING (auth.uid() = user_id);

-- Enterprise inquiries policies
DROP POLICY IF EXISTS "Allow inquiry submissions from authenticated users" ON public.enterprise_inquiries;
DROP POLICY IF EXISTS "Allow enterprise admins to manage inquiries" ON public.enterprise_inquiries;
DROP POLICY IF EXISTS "Deny enterprise inquiries access to non-admins" ON public.enterprise_inquiries;

CREATE POLICY "Allow inquiry submissions from authenticated users" ON public.enterprise_inquiries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow enterprise admins to manage inquiries" ON public.enterprise_inquiries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Deny enterprise inquiries access to non-admins" ON public.enterprise_inquiries
  FOR SELECT USING (false);

-- FileStorage policies
DROP POLICY IF EXISTS "Users can insert files for their researches" ON public."FileStorage";
DROP POLICY IF EXISTS "Users can view files from their researches" ON public."FileStorage";
DROP POLICY IF EXISTS "Users can update files from their researches" ON public."FileStorage";
DROP POLICY IF EXISTS "Users can delete files from their researches" ON public."FileStorage";

CREATE POLICY "Users can insert files for their researches" ON public."FileStorage"
  FOR INSERT WITH CHECK (public.user_owns_research(project_id));

CREATE POLICY "Users can view files from their researches" ON public."FileStorage"
  FOR SELECT USING (public.user_owns_research(project_id));

CREATE POLICY "Users can update files from their researches" ON public."FileStorage"
  FOR UPDATE USING (public.user_owns_research(project_id));

CREATE POLICY "Users can delete files from their researches" ON public."FileStorage"
  FOR DELETE USING (public.user_owns_research(project_id));

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;