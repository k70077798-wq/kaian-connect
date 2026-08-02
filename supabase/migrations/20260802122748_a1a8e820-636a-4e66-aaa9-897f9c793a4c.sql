CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_peer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conversation_id uuid;
  _lock_key bigint;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF _peer_id IS NULL OR _peer_id = _me THEN
    RAISE EXCEPTION 'invalid peer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = _me AND f.addressee_id = _peer_id)
        OR (f.requester_id = _peer_id AND f.addressee_id = _me))
  ) THEN
    RAISE EXCEPTION 'accepted friendship required';
  END IF;

  _lock_key := hashtextextended(LEAST(_me::text, _peer_id::text) || ':' || GREATEST(_me::text, _peer_id::text), 0);
  PERFORM pg_advisory_xact_lock(_lock_key);

  SELECT c.id INTO _conversation_id
  FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = _me)
    AND EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = _peer_id)
    AND (SELECT count(*) FROM public.conversation_members cm WHERE cm.conversation_id = c.id) = 2
  ORDER BY c.created_at
  LIMIT 1;

  IF _conversation_id IS NULL THEN
    INSERT INTO public.conversations (created_by, is_group)
    VALUES (_me, false)
    RETURNING id INTO _conversation_id;

    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (_conversation_id, _me), (_conversation_id, _peer_id);
  END IF;

  RETURN _conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO service_role;

DROP TRIGGER IF EXISTS trg_notify_friendship ON public.friendships;
DROP TRIGGER IF EXISTS trg_bump_conv ON public.messages;
DROP TRIGGER IF EXISTS trg_notify_msg ON public.messages;