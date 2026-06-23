-- Add checklist/subtasks support for chores
ALTER TABLE public.kid_chores 
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

-- Add comment explaining checklist format
COMMENT ON COLUMN public.kid_chores.checklist IS 'Array of subtasks: [{id, title, completed}]';

-- Update recurrence_pattern comment for clarity
COMMENT ON COLUMN public.kid_chores.recurrence_pattern IS 'Recurrence: daily, weekly, biweekly, monthly';