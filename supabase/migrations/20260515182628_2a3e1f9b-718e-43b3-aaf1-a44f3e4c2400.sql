
-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  title text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX idx_conv_members_conv ON public.conversation_members(conversation_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  media_url text,
  media_type text, -- image | video | audio | file
  file_name text,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  forwarded_from uuid,
  call_kind text,      -- 'audio' | 'video' | null
  call_status text,    -- 'started' | 'ended' | 'missed' | 'declined'
  call_duration int,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_messages_conv_time ON public.messages(conversation_id, created_at DESC);

-- Call signaling (ephemeral)
CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  kind text NOT NULL, -- 'offer' | 'answer' | 'ice' | 'hangup' | 'ring' | 'accept' | 'decline'
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_call_signals_to ON public.call_signals(to_user, created_at DESC);

-- Membership helper (SECURITY DEFINER) to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv AND user_id = _user
  )
$$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Conversations
CREATE POLICY "conv read members" ON public.conversations FOR SELECT
USING (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "conv insert auth" ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);
CREATE POLICY "conv update members" ON public.conversations FOR UPDATE
USING (public.is_conversation_member(id, auth.uid()));

-- Members
CREATE POLICY "members read same conv" ON public.conversation_members FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "members insert self or by creator" ON public.conversation_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
);
CREATE POLICY "members delete self" ON public.conversation_members FOR DELETE
USING (auth.uid() = user_id);
CREATE POLICY "members update self" ON public.conversation_members FOR UPDATE
USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "msg read members" ON public.messages FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "msg insert members" ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "msg update own" ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);
CREATE POLICY "msg delete own" ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- Call signals
CREATE POLICY "signal read self" ON public.call_signals FOR SELECT
USING (auth.uid() = to_user OR auth.uid() = from_user);
CREATE POLICY "signal insert member" ON public.call_signals FOR INSERT
WITH CHECK (auth.uid() = from_user AND public.is_conversation_member(conversation_id, auth.uid()));

-- Bump conversation last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- Notify recipients on new message
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text; rec record;
BEGIN
  SELECT COALESCE(full_name, username, 'مستخدم') INTO actor_name FROM public.profiles WHERE id = NEW.sender_id;
  FOR rec IN SELECT user_id FROM public.conversation_members WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id LOOP
    INSERT INTO public.notifications(user_id, type, content, link)
    VALUES (rec.user_id, 'message', actor_name || ' أرسل لك رسالة', '/messages?c=' || NEW.conversation_id);
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_msg AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- Realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.call_signals REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
