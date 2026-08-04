ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS action_url text;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)
           ORDER BY CASE WHEN status = 'accepted' THEN 0 ELSE 1 END, created_at, id
         ) AS rn
  FROM public.friendships
)
DELETE FROM public.friendships f
USING ranked r
WHERE f.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair_idx
ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE OR REPLACE FUNCTION public.validate_friendship_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_id = NEW.addressee_id THEN
    RAISE EXCEPTION 'cannot friend yourself';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.requester_id <> OLD.requester_id OR NEW.addressee_id <> OLD.addressee_id THEN
      RAISE EXCEPTION 'friendship participants cannot change';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'pending' AND NEW.status = 'accepted' AND auth.uid() = OLD.addressee_id) THEN
      RAISE EXCEPTION 'only the recipient can accept this request';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_friendship_change ON public.friendships;
CREATE TRIGGER trg_validate_friendship_change
BEFORE INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.validate_friendship_change();

DROP POLICY IF EXISTS "media owner upload" ON storage.objects;
CREATE POLICY "media owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) = ANY (ARRAY[
    'jpg','jpeg','png','webp','gif','heic',
    'mp4','webm','mov','m4v','m3u8',
    'mp3','wav','m4a','ogg','pdf','doc','docx','txt','zip'
  ])
  AND COALESCE((metadata->>'size')::bigint, 0) <= 52428800
);

DROP POLICY IF EXISTS "media owner update" ON storage.objects;
CREATE POLICY "media owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND owner_id = auth.uid()::text)
WITH CHECK (
  bucket_id = 'media'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND COALESCE((metadata->>'size')::bigint, 0) <= 52428800
);

DROP POLICY IF EXISTS "media owner delete" ON storage.objects;
CREATE POLICY "media owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND owner_id = auth.uid()::text);