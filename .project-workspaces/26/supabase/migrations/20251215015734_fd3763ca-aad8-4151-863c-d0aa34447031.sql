-- Add chart color preference column to kids_profiles
ALTER TABLE public.kids_profiles 
ADD COLUMN chart_color text DEFAULT 'purple';

-- Add comment for clarity
COMMENT ON COLUMN public.kids_profiles.chart_color IS 'User preferred color for charts: purple, pink, blue, green, orange, cyan';