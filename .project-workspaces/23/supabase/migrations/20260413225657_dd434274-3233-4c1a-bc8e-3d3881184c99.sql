-- Allow anonymous visitors to read published pages
CREATE POLICY "Anyone can view published pages"
ON public.pages
FOR SELECT
TO anon
USING (is_published = true);

-- Allow anonymous visitors to insert contacts (opt-in form submissions)
CREATE POLICY "Anon can insert contacts via public forms"
ON public.contacts
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous visitors to insert form submissions
CREATE POLICY "Anon can insert form submissions via public forms"
ON public.form_submissions
FOR INSERT
TO anon
WITH CHECK (true);