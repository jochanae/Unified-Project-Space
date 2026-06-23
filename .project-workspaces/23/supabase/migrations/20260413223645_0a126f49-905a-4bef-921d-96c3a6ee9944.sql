
CREATE TABLE public.admin_dev_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_dev_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dev notes"
ON public.admin_dev_notes
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
