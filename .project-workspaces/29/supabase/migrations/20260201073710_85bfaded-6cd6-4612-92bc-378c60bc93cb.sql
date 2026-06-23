-- Create enum for content status
CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');

-- Create enum for difficulty level
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create lesson categories table
CREATE TABLE public.lesson_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.lesson_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    content TEXT,
    difficulty difficulty_level NOT NULL DEFAULT 'beginner',
    duration_minutes INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status content_status NOT NULL DEFAULT 'draft',
    thumbnail_url TEXT,
    video_url TEXT,
    key_takeaways TEXT[],
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create educational videos table
CREATE TABLE public.educational_videos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.lesson_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status content_status NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create educational resources table
CREATE TABLE public.educational_resources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.lesson_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    resource_url TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT 'article',
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status content_status NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user lesson progress table
CREATE TABLE public.user_lesson_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- Enable RLS on all tables
ALTER TABLE public.lesson_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_categories (public read, admin write)
CREATE POLICY "Anyone can view published categories"
ON public.lesson_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.lesson_categories FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS Policies for lessons (public read published, admin write)
CREATE POLICY "Anyone can view published lessons"
ON public.lessons FOR SELECT
USING (status = 'published' OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage lessons"
ON public.lessons FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS Policies for educational_videos (public read published, admin write)
CREATE POLICY "Anyone can view published videos"
ON public.educational_videos FOR SELECT
USING (status = 'published' OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage videos"
ON public.educational_videos FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS Policies for educational_resources (public read published, admin write)
CREATE POLICY "Anyone can view published resources"
ON public.educational_resources FOR SELECT
USING (status = 'published' OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage resources"
ON public.educational_resources FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS Policies for user_lesson_progress
CREATE POLICY "Users can view their own progress"
ON public.user_lesson_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress"
ON public.user_lesson_progress FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_lesson_categories_updated_at
BEFORE UPDATE ON public.lesson_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_educational_videos_updated_at
BEFORE UPDATE ON public.educational_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_educational_resources_updated_at
BEFORE UPDATE ON public.educational_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_lesson_progress_updated_at
BEFORE UPDATE ON public.user_lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_lessons_category ON public.lessons(category_id);
CREATE INDEX idx_lessons_status ON public.lessons(status);
CREATE INDEX idx_lessons_slug ON public.lessons(slug);
CREATE INDEX idx_educational_videos_category ON public.educational_videos(category_id);
CREATE INDEX idx_educational_resources_category ON public.educational_resources(category_id);
CREATE INDEX idx_user_lesson_progress_user ON public.user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_lesson ON public.user_lesson_progress(lesson_id);