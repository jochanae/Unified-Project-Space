-- Restrict EXECUTE on check_ai_access — only authenticated users + service role
REVOKE EXECUTE ON FUNCTION public.check_ai_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_access(uuid, text) TO authenticated, service_role;

-- banned_users: admin-only write policies (service role bypasses RLS anyway)
CREATE POLICY "Admins can insert bans"
  ON public.banned_users FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bans"
  ON public.banned_users FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bans"
  ON public.banned_users FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ai_call_log: admin-only SELECT (writes happen via SECURITY DEFINER fn / service role)
CREATE POLICY "Admins can read AI call log"
  ON public.ai_call_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));