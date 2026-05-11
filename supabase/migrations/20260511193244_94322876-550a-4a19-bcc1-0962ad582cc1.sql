
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Notifications insert" ON public.notifications;
CREATE POLICY "Notifications insert auth" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
