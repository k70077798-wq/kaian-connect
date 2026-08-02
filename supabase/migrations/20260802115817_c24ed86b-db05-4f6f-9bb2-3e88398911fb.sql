ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS work text,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS hometown text,
  ADD COLUMN IF NOT EXISTS relationship text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tips_seen boolean NOT NULL DEFAULT false;

-- existing users shouldn't be forced through onboarding
UPDATE public.profiles SET onboarding_completed = true, tips_seen = true WHERE created_at < now();