
-- 1. Notifications: restrict INSERT to self only (triggers use SECURITY DEFINER, bypass RLS)
DROP POLICY IF EXISTS "Notifications insert auth" ON public.notifications;
CREATE POLICY "Notifications insert self" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Posts: enforce privacy
DROP POLICY IF EXISTS "Posts public read" ON public.posts;
CREATE POLICY "Posts visibility" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (
    COALESCE(privacy, 'public') = 'public'
    OR auth.uid() = user_id
    OR (
      COALESCE(privacy, 'public') = 'friends'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = posts.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = posts.user_id)
          )
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Storage media: restrict upload path to user UID folder; remove broad listing
DROP POLICY IF EXISTS "Media auth upload" ON storage.objects;
CREATE POLICY "Media auth upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Remove broad listing policy on public bucket (files still served via public URL)
DROP POLICY IF EXISTS "Media public read" ON storage.objects;

-- 4. Wallet transactions: remove direct INSERT, only SECURITY DEFINER triggers/funcs can write
DROP POLICY IF EXISTS "tx_insert_self" ON public.wallet_transactions;

-- 5. Revoke EXECUTE on SECURITY DEFINER trigger/admin functions from anon & authenticated
REVOKE EXECUTE ON FUNCTION public.ensure_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_ad_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reward_on_share() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_topup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_withdrawal_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_withdrawal_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_friendship() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM PUBLIC, anon;

-- Helper functions used inside RLS policies must remain executable by authenticated;
-- revoke from anon to reduce surface
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;
