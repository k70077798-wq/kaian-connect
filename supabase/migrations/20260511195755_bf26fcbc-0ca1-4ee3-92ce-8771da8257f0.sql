
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS feeling text,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stories read" ON public.stories;
CREATE POLICY "Stories read" ON public.stories FOR SELECT USING (expires_at > now());
DROP POLICY IF EXISTS "Stories insert" ON public.stories;
CREATE POLICY "Stories insert" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Stories delete" ON public.stories;
CREATE POLICY "Stories delete" ON public.stories FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Media public read" ON storage.objects;
CREATE POLICY "Media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
DROP POLICY IF EXISTS "Media auth upload" ON storage.objects;
CREATE POLICY "Media auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
DROP POLICY IF EXISTS "Media owner update" ON storage.objects;
CREATE POLICY "Media owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND owner = auth.uid());
DROP POLICY IF EXISTS "Media owner delete" ON storage.objects;
CREATE POLICY "Media owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND owner = auth.uid());
