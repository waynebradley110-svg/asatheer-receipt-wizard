-- Create coaches table
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All staff can view coaches"
  ON public.coaches
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage coaches"
  ON public.coaches
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert the 3 coaches
INSERT INTO public.coaches (name, is_active) VALUES
  ('Sari', true),
  ('Karim', true),
  ('Hanna', true);

-- Create trigger for updated_at
CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Clean up existing coach names in member_services
UPDATE public.member_services
SET coach_name = 'Sari'
WHERE LOWER(REPLACE(coach_name, 'coach ', '')) = 'sari'
  AND zone = 'pt';

UPDATE public.member_services
SET coach_name = 'Karim'
WHERE LOWER(REPLACE(coach_name, 'coach ', '')) = 'karim'
  AND zone = 'pt';

UPDATE public.member_services
SET coach_name = 'Hanna'
WHERE LOWER(REPLACE(coach_name, 'coach ', '')) IN ('hanna', 'hana')
  AND zone = 'pt';