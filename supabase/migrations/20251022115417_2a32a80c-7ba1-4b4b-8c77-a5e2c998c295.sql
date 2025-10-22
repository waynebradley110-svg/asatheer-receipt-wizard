-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT now() NOT NULL,
  zone zone_type,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on attendance table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for attendance
CREATE POLICY "Allow all operations for authenticated users" ON public.attendance
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_attendance_member_id ON public.attendance(member_id);
CREATE INDEX idx_attendance_check_in_time ON public.attendance(check_in_time);
CREATE INDEX idx_attendance_created_at ON public.attendance(created_at);