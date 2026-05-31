
-- 1) Lock down analytics_snapshots
DROP POLICY IF EXISTS "Allow authenticated users to read analytics" ON public.analytics_snapshots;
DROP POLICY IF EXISTS "Allow authenticated users to insert analytics" ON public.analytics_snapshots;

CREATE POLICY "Admins and accounts can read analytics"
ON public.analytics_snapshots
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accounts'::app_role));

CREATE POLICY "Admins and accounts can insert analytics"
ON public.analytics_snapshots
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accounts'::app_role));

-- 2) Realtime channel authorization: only staff roles may subscribe
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read realtime messages" ON realtime.messages;
CREATE POLICY "Staff can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'receptionist'::app_role)
  OR public.has_role(auth.uid(), 'accounts'::app_role)
);
