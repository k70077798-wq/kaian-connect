
-- 1) WALLETS
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_owner_select" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wallet_owner_insert" ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wallet_admin_update" ON public.wallets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) TRANSACTIONS
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- share_reward | topup | withdraw | ad_spend | admin_credit | admin_debit
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- pending|completed|rejected
  method TEXT,
  reference TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_select" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tx_insert_self" ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 3) TOPUP REQUESTS
CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,         -- visa | onecash | floosak | jaib | jawali
  reference TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.topup_requests TO authenticated;
GRANT UPDATE ON public.topup_requests TO authenticated;
GRANT ALL ON public.topup_requests TO service_role;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topup_select" ON public.topup_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "topup_insert" ON public.topup_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "topup_admin_update" ON public.topup_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) WITHDRAWAL REQUESTS
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 10),
  method TEXT NOT NULL,
  account_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT UPDATE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_select" ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wd_insert" ON public.withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "wd_admin_update" ON public.withdrawal_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) POST SHARES (one reward per user per post)
CREATE TABLE public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
GRANT SELECT, INSERT ON public.post_shares TO authenticated;
GRANT ALL ON public.post_shares TO service_role;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shares_select" ON public.post_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "shares_insert_self" ON public.post_shares FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6) AD CAMPAIGNS
CREATE TABLE public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  cta TEXT DEFAULT 'اعرف المزيد',
  budget NUMERIC(12,2) NOT NULL CHECK (budget >= 1),
  spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_cost NUMERIC(12,2) NOT NULL DEFAULT 1,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  audience TEXT DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'pending', -- pending|active|paused|completed|rejected
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_select_active_or_owner" ON public.ad_campaigns FOR SELECT TO authenticated
  USING (status = 'active' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ads_insert_self" ON public.ad_campaigns FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "ads_update_owner_or_admin" ON public.ad_campaigns FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 7) APP SETTINGS
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all" ON public.app_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "settings_admin_write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings(key, value) VALUES
  ('share_reward', '1'::jsonb),
  ('min_withdrawal', '10'::jsonb),
  ('ad_min_budget', '1'::jsonb),
  ('ad_daily_cost', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8) Auto-create wallet for new users
CREATE OR REPLACE FUNCTION public.ensure_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_user_created_wallet ON auth.users;
CREATE TRIGGER on_user_created_wallet AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_wallet();

-- Backfill wallets for existing users
INSERT INTO public.wallets(user_id) SELECT id FROM auth.users
ON CONFLICT DO NOTHING;

-- 9) Reward on share
CREATE OR REPLACE FUNCTION public.reward_on_share()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reward NUMERIC;
BEGIN
  SELECT (value::text)::numeric INTO reward FROM public.app_settings WHERE key='share_reward';
  reward := COALESCE(reward, 1);
  INSERT INTO public.wallets(user_id, balance) VALUES (NEW.user_id, reward)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + reward, updated_at = now();
  INSERT INTO public.wallet_transactions(user_id, type, amount, status, note)
    VALUES (NEW.user_id, 'share_reward', reward, 'completed', 'مكافأة مشاركة منشور');
  UPDATE public.posts SET shares_count = COALESCE(shares_count,0) + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END $$;
CREATE TRIGGER on_share_reward AFTER INSERT ON public.post_shares
  FOR EACH ROW EXECUTE FUNCTION public.reward_on_share();

-- 10) Approve topup: credit wallet
CREATE OR REPLACE FUNCTION public.process_topup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.wallets(user_id, balance) VALUES (NEW.user_id, NEW.amount)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + NEW.amount, updated_at = now();
    INSERT INTO public.wallet_transactions(user_id, type, amount, status, method, reference, note)
      VALUES (NEW.user_id, 'topup', NEW.amount, 'completed', NEW.method, NEW.reference, 'تعبئة محفظة');
    NEW.processed_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_topup_process BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_topup();

-- 11) Withdraw request: hold balance immediately
CREATE OR REPLACE FUNCTION public.process_withdrawal_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal NUMERIC;
BEGIN
  SELECT balance INTO bal FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
  IF bal IS NULL OR bal < NEW.amount THEN
    RAISE EXCEPTION 'رصيد غير كافٍ';
  END IF;
  UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
  INSERT INTO public.wallet_transactions(user_id, type, amount, status, method, note)
    VALUES (NEW.user_id, 'withdraw', NEW.amount, 'pending', NEW.method, 'طلب سحب رصيد');
  RETURN NEW;
END $$;
CREATE TRIGGER on_withdraw_insert BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_withdrawal_insert();

CREATE OR REPLACE FUNCTION public.process_withdrawal_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- refund
    UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
    INSERT INTO public.wallet_transactions(user_id, type, amount, status, note)
      VALUES (NEW.user_id, 'admin_credit', NEW.amount, 'completed', 'إعادة رصيد بعد رفض السحب');
    NEW.processed_at := now();
  ELSIF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- mark the pending withdraw tx as completed
    UPDATE public.wallet_transactions SET status='completed'
      WHERE user_id = NEW.user_id AND type='withdraw' AND status='pending'
      AND created_at = (SELECT MAX(created_at) FROM public.wallet_transactions WHERE user_id = NEW.user_id AND type='withdraw' AND status='pending');
    NEW.processed_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_withdraw_update BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_withdrawal_update();

-- 12) Ad campaign: deduct on create
CREATE OR REPLACE FUNCTION public.process_ad_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal NUMERIC;
BEGIN
  SELECT balance INTO bal FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
  IF bal IS NULL OR bal < NEW.budget THEN
    RAISE EXCEPTION 'رصيد المحفظة غير كافٍ لإنشاء الحملة';
  END IF;
  UPDATE public.wallets SET balance = balance - NEW.budget, updated_at = now() WHERE user_id = NEW.user_id;
  INSERT INTO public.wallet_transactions(user_id, type, amount, status, note, reference)
    VALUES (NEW.user_id, 'ad_spend', NEW.budget, 'completed', 'إنشاء حملة إعلانية: '||NEW.title, NEW.id::text);
  NEW.status := 'active';
  RETURN NEW;
END $$;
CREATE TRIGGER on_ad_insert BEFORE INSERT ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.process_ad_insert();

-- 13) Admin adjust wallet helper
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id UUID, _amount NUMERIC, _note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.wallets(user_id, balance) VALUES (_user_id, GREATEST(_amount,0))
    ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + _amount, updated_at = now();
  INSERT INTO public.wallet_transactions(user_id, type, amount, status, note)
    VALUES (_user_id, CASE WHEN _amount >= 0 THEN 'admin_credit' ELSE 'admin_debit' END, ABS(_amount), 'completed', _note);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(UUID, NUMERIC, TEXT) TO authenticated;
