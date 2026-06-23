-- The existing unique index on (user_id, title) where 
-- status = 'active' prevents a user from creating two 
-- active plans with the same title. At scale this causes 
-- silent failures when users naturally reuse plan names.
-- Replace with a softer constraint that allows duplicates
-- but prevents exact same title + companion combination.

DROP INDEX IF EXISTS idx_companion_plans_unique;

CREATE UNIQUE INDEX idx_companion_plans_unique 
  ON public.companion_plans (user_id, member_id, title) 
  WHERE status = 'active';

-- This allows: same title with different companions
-- This prevents: exact duplicate (same user + same 
-- companion + same title) which is genuinely redundant
