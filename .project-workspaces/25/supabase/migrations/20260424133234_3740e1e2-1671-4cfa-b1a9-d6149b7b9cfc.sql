CREATE POLICY "Admins can delete app error logs"
ON public.app_error_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));