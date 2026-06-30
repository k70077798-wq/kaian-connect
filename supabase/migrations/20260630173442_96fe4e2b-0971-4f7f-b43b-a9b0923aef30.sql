
CREATE OR REPLACE FUNCTION public.ad_impression(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ad_campaigns
  SET impressions = COALESCE(impressions, 0) + 1
  WHERE id = _id AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.ad_click(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ad_campaigns
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = _id AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.ad_impression(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ad_click(uuid) TO anon, authenticated;
