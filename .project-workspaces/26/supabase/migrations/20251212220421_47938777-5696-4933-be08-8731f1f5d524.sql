-- Add chore_type column to support individual, family, and bonus "grab first" chores
ALTER TABLE public.kid_chores 
ADD COLUMN IF NOT EXISTS chore_type text NOT NULL DEFAULT 'individual';

-- Add claimed_by column for bonus chores (who claimed it first)
ALTER TABLE public.kid_chores 
ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES public.kids_profiles(id);

-- Add claimed_at timestamp
ALTER TABLE public.kid_chores 
ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone;

-- Add is_bonus flag for extra reward tasks
ALTER TABLE public.kid_chores 
ADD COLUMN IF NOT EXISTS is_bonus boolean NOT NULL DEFAULT false;

-- Add comment explaining chore_type values
COMMENT ON COLUMN public.kid_chores.chore_type IS 'Type of chore: individual (assigned to one kid), family (visible to all in group), bonus (grab first competitive)';

-- Create index for faster queries on family bonus chores
CREATE INDEX IF NOT EXISTS idx_kid_chores_family_bonus ON public.kid_chores (family_group_id, chore_type, status) WHERE chore_type = 'bonus';