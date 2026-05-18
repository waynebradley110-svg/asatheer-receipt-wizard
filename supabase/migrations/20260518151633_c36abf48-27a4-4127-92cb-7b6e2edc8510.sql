
-- 1. VIP tracking
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS vip_started_at timestamptz;

UPDATE public.members
  SET vip_started_at = now()
  WHERE is_vip = true AND vip_started_at IS NULL;

CREATE OR REPLACE FUNCTION public.handle_vip_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_vip IS DISTINCT FROM OLD.is_vip THEN
    IF NEW.is_vip = true THEN
      NEW.vip_started_at = now();
    ELSE
      NEW.vip_started_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_vip_change ON public.members;
CREATE TRIGGER trg_handle_vip_change
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vip_change();

-- 2. Admin password grants
CREATE TABLE IF NOT EXISTS public.admin_password_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_password_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read own grants" ON public.admin_password_grants;
CREATE POLICY "Admins read own grants"
  ON public.admin_password_grants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete own grants" ON public.admin_password_grants;
CREATE POLICY "Admins delete own grants"
  ON public.admin_password_grants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- (Insertion happens only from the edge function via service role, no INSERT policy needed.)

CREATE INDEX IF NOT EXISTS idx_admin_password_grants_user_exp
  ON public.admin_password_grants(user_id, expires_at DESC);

-- 3. Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
