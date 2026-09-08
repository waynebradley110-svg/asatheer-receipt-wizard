-- PROGRAMS
CREATE TABLE public.swimming_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level text,
  age_min integer,
  age_max integer,
  duration_weeks integer,
  price numeric NOT NULL DEFAULT 0,
  max_students integer NOT NULL DEFAULT 10,
  coach_name text,
  pool_name text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swimming_programs TO authenticated;
GRANT ALL ON public.swimming_programs TO service_role;
ALTER TABLE public.swimming_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage swimming programs" ON public.swimming_programs FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'));
CREATE TRIGGER update_swimming_programs_updated_at BEFORE UPDATE ON public.swimming_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHILDREN
CREATE TABLE public.swimming_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.swimming_programs(id) ON DELETE SET NULL,
  level text,
  coach_name text,
  pool_name text,
  parent_name text,
  parent_whatsapp text,
  emergency_contact text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  classes_total integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_swimming_children_member ON public.swimming_children(member_id);
CREATE INDEX idx_swimming_children_program ON public.swimming_children(program_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swimming_children TO authenticated;
GRANT ALL ON public.swimming_children TO service_role;
ALTER TABLE public.swimming_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage swimming children" ON public.swimming_children FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'));
CREATE TRIGGER update_swimming_children_updated_at BEFORE UPDATE ON public.swimming_children FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLASSES
CREATE TABLE public.swimming_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  program_id uuid REFERENCES public.swimming_programs(id) ON DELETE SET NULL,
  coach_name text,
  pool_name text,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 10,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_swimming_classes_program ON public.swimming_classes(program_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swimming_classes TO authenticated;
GRANT ALL ON public.swimming_classes TO service_role;
ALTER TABLE public.swimming_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage swimming classes" ON public.swimming_classes FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'));
CREATE TRIGGER update_swimming_classes_updated_at BEFORE UPDATE ON public.swimming_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EXCEPTIONS
CREATE TABLE public.swimming_class_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.swimming_classes(id) ON DELETE CASCADE,
  original_date date NOT NULL,
  status text NOT NULL DEFAULT 'cancelled',
  new_date date,
  new_start_time time,
  new_end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, original_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swimming_class_exceptions TO authenticated;
GRANT ALL ON public.swimming_class_exceptions TO service_role;
ALTER TABLE public.swimming_class_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage swimming exceptions" ON public.swimming_class_exceptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'));
CREATE TRIGGER update_swimming_class_exceptions_updated_at BEFORE UPDATE ON public.swimming_class_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ENROLLMENTS
CREATE TABLE public.swimming_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.swimming_children(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.swimming_classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, class_id)
);
CREATE INDEX idx_swimming_enrollments_class ON public.swimming_enrollments(class_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swimming_enrollments TO authenticated;
GRANT ALL ON public.swimming_enrollments TO service_role;
ALTER TABLE public.swimming_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage swimming enrollments" ON public.swimming_enrollments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'));
CREATE TRIGGER update_swimming_enrollments_updated_at BEFORE UPDATE ON public.swimming_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ATTENDANCE
CREATE TABLE public.swimming_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.swimming_children(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.swimming_classes(id) ON DELETE SET NULL,
  class_date date NOT NULL,
  status text NOT NULL DEFAULT 'present',
  notes text,
  marked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, class_id, class_date)
);
CREATE INDEX idx_swimming_attendance_child ON public.swimming_attendance(child_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swimming_attendance TO authenticated;
GRANT ALL ON public.swimming_attendance TO service_role;
ALTER TABLE public.swimming_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage swimming attendance" ON public.swimming_attendance FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'));
CREATE TRIGGER update_swimming_attendance_updated_at BEFORE UPDATE ON public.swimming_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CALENDAR TOKENS
CREATE TABLE public.swimming_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.swimming_children(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swimming_calendar_tokens TO authenticated;
GRANT ALL ON public.swimming_calendar_tokens TO service_role;
ALTER TABLE public.swimming_calendar_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage swimming calendar tokens" ON public.swimming_calendar_tokens FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'accounts'));
CREATE TRIGGER update_swimming_calendar_tokens_updated_at BEFORE UPDATE ON public.swimming_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PUBLIC PARENT LOOKUP (single child, by token)
CREATE OR REPLACE FUNCTION public.get_swimming_calendar(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _child_id uuid;
  _result jsonb;
BEGIN
  SELECT child_id INTO _child_id
  FROM public.swimming_calendar_tokens
  WHERE token = _token AND is_active = true;

  IF _child_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'child', jsonb_build_object(
      'id', c.id,
      'name', m.full_name,
      'program', p.name,
      'level', c.level,
      'coach_name', c.coach_name,
      'pool_name', c.pool_name,
      'start_date', c.start_date
    ),
    'classes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cl.id,
        'title', cl.title,
        'program', pp.name,
        'coach_name', COALESCE(cl.coach_name, c.coach_name),
        'pool_name', COALESCE(cl.pool_name, c.pool_name),
        'day_of_week', cl.day_of_week,
        'start_time', cl.start_time,
        'end_time', cl.end_time,
        'start_date', cl.start_date,
        'end_date', cl.end_date,
        'exceptions', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'original_date', e.original_date,
            'status', e.status,
            'new_date', e.new_date,
            'new_start_time', e.new_start_time,
            'new_end_time', e.new_end_time,
            'reason', e.reason
          )) FROM public.swimming_class_exceptions e WHERE e.class_id = cl.id
        ), '[]'::jsonb)
      ))
      FROM public.swimming_enrollments en
      JOIN public.swimming_classes cl ON cl.id = en.class_id AND cl.is_active = true
      LEFT JOIN public.swimming_programs pp ON pp.id = cl.program_id
      WHERE en.child_id = c.id AND en.status = 'active'
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.swimming_children c
  JOIN public.members m ON m.id = c.member_id
  LEFT JOIN public.swimming_programs p ON p.id = c.program_id
  WHERE c.id = _child_id;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_swimming_calendar(text) TO anon, authenticated;

-- SEED PROGRAMS
INSERT INTO public.swimming_programs (name, level, age_min, age_max, duration_weeks, price, max_students) VALUES
  ('Baby Swimming','baby',1,3,4,400,6),
  ('Kids Beginner','beginner',4,8,4,350,10),
  ('Kids Intermediate','intermediate',6,12,4,400,10),
  ('Kids Advanced','advanced',8,16,4,450,8),
  ('Learn to Swim','beginner',5,14,8,600,10),
  ('Private Swimming','private',3,60,4,900,1),
  ('Adult Swimming','adult',16,70,4,450,8),
  ('Holiday Swimming Program','mixed',5,16,2,300,12);
