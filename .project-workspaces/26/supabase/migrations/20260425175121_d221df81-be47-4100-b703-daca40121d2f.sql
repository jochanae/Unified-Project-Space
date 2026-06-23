-- Tighten bug_reports INSERT — drop the NULL bypass branch
DROP POLICY IF EXISTS "Authenticated users can submit own bug reports" ON public.bug_reports;

CREATE POLICY "Authenticated users can submit own bug reports"
ON public.bug_reports
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Tighten professional_applications anonymous INSERT
-- Keep public submission (intentional product behavior) but require minimum payload
DROP POLICY IF EXISTS "Anyone can submit professional applications" ON public.professional_applications;

CREATE POLICY "Anyone can submit professional applications"
ON public.professional_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(trim(email)) > 3
  AND email LIKE '%@%'
);