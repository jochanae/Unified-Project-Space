-- Create plan_sections table for custom user sections
CREATE TABLE public.plan_sections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'target',
    color TEXT DEFAULT 'primary',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_collapsed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plan_items table for individual plan items
CREATE TABLE public.plan_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    section_id UUID REFERENCES public.plan_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    priority TEXT DEFAULT 'medium',
    source_type TEXT DEFAULT 'manual',
    source_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    source_message_content TEXT,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    target_date DATE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint for valid statuses
ALTER TABLE public.plan_items 
ADD CONSTRAINT plan_items_status_check 
CHECK (status IN ('not_started', 'in_progress', 'completed', 'archived'));

-- Add constraint for valid priorities
ALTER TABLE public.plan_items 
ADD CONSTRAINT plan_items_priority_check 
CHECK (priority IN ('low', 'medium', 'high'));

-- Add constraint for valid source types
ALTER TABLE public.plan_items 
ADD CONSTRAINT plan_items_source_type_check 
CHECK (source_type IN ('manual', 'quinn_suggestion', 'imported'));

-- Enable RLS
ALTER TABLE public.plan_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for plan_sections
CREATE POLICY "Users can manage their own plan sections"
ON public.plan_sections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for plan_items
CREATE POLICY "Users can manage their own plan items"
ON public.plan_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_plan_sections_user_id ON public.plan_sections(user_id);
CREATE INDEX idx_plan_items_user_id ON public.plan_items(user_id);
CREATE INDEX idx_plan_items_section_id ON public.plan_items(section_id);
CREATE INDEX idx_plan_items_status ON public.plan_items(status);

-- Trigger for updated_at
CREATE TRIGGER update_plan_sections_updated_at
    BEFORE UPDATE ON public.plan_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_items_updated_at
    BEFORE UPDATE ON public.plan_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default sections for new users
CREATE OR REPLACE FUNCTION public.create_default_plan_sections()
RETURNS TRIGGER AS $$
BEGIN
    -- Create Foundations section
    INSERT INTO public.plan_sections (user_id, name, icon, color, sort_order, is_default)
    VALUES (NEW.user_id, 'Foundations', 'shield', 'emerald', 0, true);
    
    -- Create Wealth Building section
    INSERT INTO public.plan_sections (user_id, name, icon, color, sort_order, is_default)
    VALUES (NEW.user_id, 'Wealth Building', 'trending-up', 'blue', 1, true);
    
    -- Create Active Investing section
    INSERT INTO public.plan_sections (user_id, name, icon, color, sort_order, is_default)
    VALUES (NEW.user_id, 'Active Investing', 'bar-chart-2', 'purple', 2, true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create default sections when profile is created
CREATE TRIGGER on_profile_created_create_plan_sections
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_plan_sections();