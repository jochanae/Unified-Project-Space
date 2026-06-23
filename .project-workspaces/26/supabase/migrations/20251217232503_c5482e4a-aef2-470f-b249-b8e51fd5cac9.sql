-- Allow anyone to view active partners (for public landing pages)
CREATE POLICY "Anyone can view active partners"
ON public.partners
FOR SELECT
USING (is_active = true);