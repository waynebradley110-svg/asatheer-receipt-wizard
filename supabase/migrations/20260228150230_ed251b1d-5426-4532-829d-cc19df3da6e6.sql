
-- =============================================
-- Feature 2: Sessions & Session Bookings tables
-- =============================================

CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  session_type TEXT NOT NULL, -- pt, football, crossfit, swimming, paddle
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  coach_id UUID REFERENCES public.coaches(id),
  max_capacity INTEGER NOT NULL DEFAULT 10,
  zone TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sessions" ON public.sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists manage sessions" ON public.sessions FOR ALL
  USING (public.has_role(auth.uid(), 'receptionist'))
  WITH CHECK (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Accounts can view sessions" ON public.sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'accounts'));

CREATE TABLE public.session_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'booked', -- booked, attended, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bookings" ON public.session_bookings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists manage bookings" ON public.session_bookings FOR ALL
  USING (public.has_role(auth.uid(), 'receptionist'))
  WITH CHECK (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Accounts can view bookings" ON public.session_bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'accounts'));

-- Trigger for updated_at on sessions
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Feature 3: Enable Realtime on attendance
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;

-- =============================================
-- Feature 1: Public read access for member portal
-- =============================================
-- Allow anonymous (public) read access to members by member_id
CREATE POLICY "Public can view member by member_id" ON public.members FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous read access to member_services
CREATE POLICY "Public can view member services" ON public.member_services FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous read access to attendance for portal
CREATE POLICY "Public can view attendance" ON public.attendance FOR SELECT
  TO anon
  USING (true);
