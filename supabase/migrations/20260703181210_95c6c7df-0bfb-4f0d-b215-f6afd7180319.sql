ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS live_stream_url TEXT;

CREATE OR REPLACE FUNCTION public.notify_on_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  mentioned_username text;
  mentioned_id uuid;
  match_arr text[];
BEGIN
  IF NEW.content IS NULL OR length(NEW.content) < 2 THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(full_name, username, 'مستخدم') INTO actor_name
    FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.content ~ '@(followers|متابعين)' THEN
    INSERT INTO public.notifications(user_id, type, content, link)
    SELECT DISTINCT
      CASE WHEN f.requester_id = NEW.user_id THEN f.addressee_id ELSE f.requester_id END,
      'mention',
      COALESCE(actor_name,'مستخدم') || ' أشار إليك في منشور',
      '/post/' || NEW.id::text
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = NEW.user_id OR f.addressee_id = NEW.user_id);
  END IF;

  FOR match_arr IN
    SELECT regexp_matches(NEW.content, '@([A-Za-z0-9_]{2,32})', 'g')
  LOOP
    mentioned_username := match_arr[1];
    IF mentioned_username IN ('followers','متابعين') THEN CONTINUE; END IF;
    SELECT id INTO mentioned_id FROM public.profiles WHERE username = mentioned_username LIMIT 1;
    IF mentioned_id IS NOT NULL AND mentioned_id <> NEW.user_id THEN
      INSERT INTO public.notifications(user_id, type, content, link)
      VALUES (mentioned_id, 'mention',
        COALESCE(actor_name,'مستخدم') || ' ذكرك في منشور',
        '/post/' || NEW.id::text);
    END IF;
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_mentions ON public.posts;
CREATE TRIGGER trg_notify_on_mentions
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_mentions();
