-- Create household_tasks table (master task templates)
CREATE TABLE public.household_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  default_reward NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'general',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT DEFAULT 'weekly',
  rotation_enabled BOOLEAN DEFAULT false,
  eligible_member_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create household_task_assignments table (assignments to specific people)
CREATE TABLE public.household_task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.household_tasks(id) ON DELETE CASCADE,
  assigned_to_user_id UUID,
  assigned_to_kid_id UUID REFERENCES public.kids_profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  reward_amount NUMERIC DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT assignment_has_assignee CHECK (assigned_to_user_id IS NOT NULL OR assigned_to_kid_id IS NOT NULL)
);

-- Create household_members table (parents and other adults who can be assigned tasks)
CREATE TABLE public.household_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'adult',
  is_assignable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.household_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for household_tasks
CREATE POLICY "Users can view their own household tasks"
  ON public.household_tasks FOR SELECT
  USING (auth.uid() = user_id OR is_family_group_member(family_group_id, auth.uid()));

CREATE POLICY "Users can create household tasks"
  ON public.household_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own household tasks"
  ON public.household_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own household tasks"
  ON public.household_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for household_task_assignments
CREATE POLICY "Users can view task assignments in their family"
  ON public.household_task_assignments FOR SELECT
  USING (
    assigned_by = auth.uid() 
    OR assigned_to_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM household_tasks ht 
      WHERE ht.id = task_id AND (ht.user_id = auth.uid() OR is_family_group_member(ht.family_group_id, auth.uid()))
    )
  );

CREATE POLICY "Users can create task assignments"
  ON public.household_task_assignments FOR INSERT
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can update task assignments they created or are assigned to"
  ON public.household_task_assignments FOR UPDATE
  USING (assigned_by = auth.uid() OR assigned_to_user_id = auth.uid());

CREATE POLICY "Users can delete task assignments they created"
  ON public.household_task_assignments FOR DELETE
  USING (assigned_by = auth.uid());

-- RLS Policies for household_members
CREATE POLICY "Family members can view household members"
  ON public.household_members FOR SELECT
  USING (is_family_group_member(family_group_id, auth.uid()));

CREATE POLICY "Family admins can manage household members"
  ON public.household_members FOR ALL
  USING (is_family_group_admin(family_group_id, auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_household_tasks_updated_at
  BEFORE UPDATE ON public.household_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_household_task_assignments_updated_at
  BEFORE UPDATE ON public.household_task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();