-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create researches table
CREATE TABLE public.researches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "Project ID" text NOT NULL UNIQUE,
  "User ID" text NOT NULL,
  "Project name" text NOT NULL,
  description text,
  status text DEFAULT 'generating'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  generated_segments jsonb,
  "segmentsCount" integer DEFAULT 0,
  CONSTRAINT researches_pkey PRIMARY KEY (id)
);

-- Create segments table
CREATE TABLE public.segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "Project ID" text NOT NULL,
  "Название сегмента" text NOT NULL,
  "Сегмент ID" numeric NOT NULL,
  description text,
  problems text,
  message text,
  is_selected boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT segments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_segments_research FOREIGN KEY ("Project ID") REFERENCES public.researches("Project ID") ON DELETE CASCADE
);

-- Create segment_analyses table
CREATE TABLE public.segment_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "Project ID" text NOT NULL,
  "Сегмент ID" numeric NOT NULL,
  "Название сегмента" text,
  analysis_type text NOT NULL,
  content jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT segment_analyses_pkey PRIMARY KEY (id),
  CONSTRAINT fk_segment_analyses_research FOREIGN KEY ("Project ID") REFERENCES public.researches("Project ID") ON DELETE CASCADE
);

-- Create top_segments table
CREATE TABLE public.top_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  segment_id integer NOT NULL,
  rank integer NOT NULL CHECK (rank >= 1 AND rank <= 3),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  description text,
  full_analysis text,
  reasoning text,
  CONSTRAINT top_segments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_top_segments_research FOREIGN KEY (project_id) REFERENCES public.researches("Project ID") ON DELETE CASCADE
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'system'::text,
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  research_id text,
  segment_id numeric,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT fk_notifications_research FOREIGN KEY (research_id) REFERENCES public.researches("Project ID") ON DELETE CASCADE
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id text NOT NULL,
  segment_id integer NOT NULL,
  analysis_type text NOT NULL,
  selected_text text NOT NULL,
  context_before text,
  context_after text,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookmarks_pkey PRIMARY KEY (id),
  CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT bookmarks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.researches("Project ID") ON DELETE CASCADE
);

-- Create converted_files table
CREATE TABLE public.converted_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  research_id text NOT NULL,
  filename text NOT NULL,
  original_type text,
  text_content text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT converted_files_pkey PRIMARY KEY (id),
  CONSTRAINT converted_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT converted_files_research_id_fkey FOREIGN KEY (research_id) REFERENCES public.researches("Project ID") ON DELETE CASCADE
);

-- Create enterprise_inquiries table
CREATE TABLE public.enterprise_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  team_size text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'new'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT enterprise_inquiries_pkey PRIMARY KEY (id)
);

-- Create FileStorage table with vector embedding
CREATE TABLE public."FileStorage" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  embedding vector(1536),
  "Счетчик" numeric DEFAULT '-1'::numeric,
  "Assistant ID" text,
  "User message" text,
  "User ID" text,
  "Project name" text,
  project_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT "FileStorage_pkey" PRIMARY KEY (id),
  CONSTRAINT fk_filestorage_research FOREIGN KEY (project_id) REFERENCES public.researches("Project ID") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_researches_user_id ON public.researches("User ID");
CREATE INDEX idx_segments_project_id ON public.segments("Project ID");
CREATE INDEX idx_segment_analyses_project_id ON public.segment_analyses("Project ID");
CREATE INDEX idx_segment_analyses_segment_id ON public.segment_analyses("Сегмент ID");
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_project_id ON public.bookmarks(project_id);
CREATE INDEX idx_converted_files_user_id ON public.converted_files(user_id);
CREATE INDEX idx_converted_files_research_id ON public.converted_files(research_id);
CREATE INDEX idx_top_segments_project_id ON public.top_segments(project_id);
CREATE INDEX idx_filestorage_project_id ON public."FileStorage"(project_id);

-- Enable Row Level Security on all tables
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

-- Create security definer function to get current user ID
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS text AS $$
  SELECT auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create security definer function to check if user owns research
CREATE OR REPLACE FUNCTION public.user_owns_research(research_project_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.researches 
    WHERE "Project ID" = research_project_id 
    AND "User ID" = auth.uid()::text
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles RLS policies
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Researches RLS policies  
CREATE POLICY "Users can insert their own researches" ON public.researches
  FOR INSERT WITH CHECK (auth.uid()::text = "User ID");

CREATE POLICY "Users can update their own researches" ON public.researches
  FOR UPDATE USING (auth.uid()::text = "User ID");

CREATE POLICY "Users can view their own researches" ON public.researches
  FOR SELECT USING (auth.uid()::text = "User ID");

CREATE POLICY "Users can delete their own researches" ON public.researches
  FOR DELETE USING (auth.uid()::text = "User ID");

-- Segments RLS policies
CREATE POLICY "Users can insert segments for their researches" ON public.segments
  FOR INSERT WITH CHECK (public.user_owns_research("Project ID"));

CREATE POLICY "Users can update segments of their researches" ON public.segments
  FOR UPDATE USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can view segments of their researches" ON public.segments
  FOR SELECT USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can delete segments of their researches" ON public.segments
  FOR DELETE USING (public.user_owns_research("Project ID"));

-- Segment analyses RLS policies
CREATE POLICY "Users can insert analyses for their segments" ON public.segment_analyses
  FOR INSERT WITH CHECK (public.user_owns_research("Project ID"));

CREATE POLICY "Users can update analyses of their segments" ON public.segment_analyses
  FOR UPDATE USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can view analyses of their segments" ON public.segment_analyses
  FOR SELECT USING (public.user_owns_research("Project ID"));

CREATE POLICY "Users can delete analyses of their segments" ON public.segment_analyses
  FOR DELETE USING (public.user_owns_research("Project ID"));

-- Top segments RLS policies
CREATE POLICY "Users can insert top segments for their researches" ON public.top_segments
  FOR INSERT WITH CHECK (public.user_owns_research(project_id));

CREATE POLICY "Users can update top segments of their researches" ON public.top_segments
  FOR UPDATE USING (public.user_owns_research(project_id));

CREATE POLICY "Users can view top segments of their researches" ON public.top_segments
  FOR SELECT USING (public.user_owns_research(project_id));

CREATE POLICY "Users can delete top segments of their researches" ON public.top_segments
  FOR DELETE USING (public.user_owns_research(project_id));

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only create notifications for themselves" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Bookmarks RLS policies
CREATE POLICY "Users can create own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks" ON public.bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Converted files RLS policies
CREATE POLICY "Users can insert their own converted files" ON public.converted_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own converted files" ON public.converted_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own converted files" ON public.converted_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own converted files" ON public.converted_files
  FOR DELETE USING (auth.uid() = user_id);

-- Enterprise inquiries RLS policies
CREATE POLICY "Allow inquiry submissions from authenticated users" ON public.enterprise_inquiries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow enterprise admins to manage inquiries" ON public.enterprise_inquiries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Deny enterprise inquiries access to non-admins" ON public.enterprise_inquiries
  FOR SELECT USING (false);

-- FileStorage RLS policies
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
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_researches_updated_at
  BEFORE UPDATE ON public.researches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_segment_analyses_updated_at
  BEFORE UPDATE ON public.segment_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_top_segments_updated_at
  BEFORE UPDATE ON public.top_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON public.bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_converted_files_updated_at
  BEFORE UPDATE ON public.converted_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enterprise_inquiries_updated_at
  BEFORE UPDATE ON public.enterprise_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_filestorage_updated_at
  BEFORE UPDATE ON public."FileStorage"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();