-- Enable realtime for collaborative tables
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.stories REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.stories; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'مستخدم') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, content, link)
  VALUES (owner_id, 'like', actor_name || ' أعجب بمنشورك', '/home#post-' || NEW.post_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'مستخدم') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, content, link)
  VALUES (owner_id, 'comment', actor_name || ' علّق على منشورك', '/home#post-' || NEW.post_id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_friendship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT COALESCE(full_name, username, 'مستخدم') INTO actor_name FROM public.profiles WHERE id = NEW.requester_id;
    INSERT INTO public.notifications(user_id, type, content, link)
    VALUES (NEW.addressee_id, 'friend_request', actor_name || ' أرسل لك طلب صداقة', '/friends');
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT COALESCE(full_name, username, 'مستخدم') INTO actor_name FROM public.profiles WHERE id = NEW.addressee_id;
    INSERT INTO public.notifications(user_id, type, content, link)
    VALUES (NEW.requester_id, 'friend_accept', actor_name || ' قبل طلب صداقتك', '/friends');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_like ON public.post_likes;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

DROP TRIGGER IF EXISTS trg_notify_comment ON public.post_comments;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS trg_notify_friendship ON public.friendships;
CREATE TRIGGER trg_notify_friendship AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friendship();