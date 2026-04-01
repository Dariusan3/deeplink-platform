-- Allow admins to update any user (for toggling is_admin)
CREATE POLICY "admins_can_update_users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
