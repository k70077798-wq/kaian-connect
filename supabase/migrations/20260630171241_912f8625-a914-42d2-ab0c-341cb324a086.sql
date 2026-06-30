
-- Attach missing triggers for wallet flow
DROP TRIGGER IF EXISTS trg_process_topup ON public.topup_requests;
CREATE TRIGGER trg_process_topup
  BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_topup();

DROP TRIGGER IF EXISTS trg_process_withdrawal_insert ON public.withdrawal_requests;
CREATE TRIGGER trg_process_withdrawal_insert
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_withdrawal_insert();

DROP TRIGGER IF EXISTS trg_process_withdrawal_update ON public.withdrawal_requests;
CREATE TRIGGER trg_process_withdrawal_update
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_withdrawal_update();

DROP TRIGGER IF EXISTS trg_reward_on_share ON public.post_shares;
CREATE TRIGGER trg_reward_on_share
  AFTER INSERT ON public.post_shares
  FOR EACH ROW EXECUTE FUNCTION public.reward_on_share();

DROP TRIGGER IF EXISTS trg_process_ad_insert ON public.ad_campaigns;
CREATE TRIGGER trg_process_ad_insert
  BEFORE INSERT ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.process_ad_insert();

-- Ensure each profile gets a wallet
DROP TRIGGER IF EXISTS trg_ensure_wallet ON public.profiles;
CREATE TRIGGER trg_ensure_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_wallet();

-- Backfill wallets for existing users
INSERT INTO public.wallets(user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Ensure wallet exists before topup approval (defensive)
CREATE OR REPLACE FUNCTION public.process_topup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.wallets(user_id, balance) VALUES (NEW.user_id, NEW.amount)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + EXCLUDED.balance, updated_at = now();
    INSERT INTO public.wallet_transactions(user_id, type, amount, status, method, reference, note)
      VALUES (NEW.user_id, 'topup', NEW.amount, 'completed', NEW.method, NEW.reference, 'تعبئة محفظة');
    NEW.processed_at := now();
  ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    NEW.processed_at := now();
  END IF;
  RETURN NEW;
END $function$;
