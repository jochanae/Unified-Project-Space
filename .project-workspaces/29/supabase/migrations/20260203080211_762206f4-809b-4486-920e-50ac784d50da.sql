-- Add footer_shortcuts column to profiles for user customization
ALTER TABLE public.profiles 
ADD COLUMN footer_shortcuts text[] DEFAULT ARRAY['keys', 'help', 'journal', 'feedback']::text[];