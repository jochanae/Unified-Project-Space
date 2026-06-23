
CREATE TABLE public.client_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  error_message text NOT NULL,
  error_stack text,
  component_name text,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all errors"
  ON public.client_errors
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Anyone can insert errors"
  ON public.client_errors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete errors"
  ON public.client_errors
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
