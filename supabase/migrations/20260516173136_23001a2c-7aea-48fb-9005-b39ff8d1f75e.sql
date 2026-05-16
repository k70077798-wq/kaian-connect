
-- Extend pages
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Followers
CREATE TABLE IF NOT EXISTS public.page_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);
ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_followers read" ON public.page_followers FOR SELECT USING (true);
CREATE POLICY "page_followers insert self" ON public.page_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "page_followers delete self" ON public.page_followers FOR DELETE USING (auth.uid() = user_id);

-- Allow posts to be linked to a page
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_followers;
