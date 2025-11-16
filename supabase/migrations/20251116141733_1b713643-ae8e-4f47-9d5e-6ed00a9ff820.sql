-- Create event_registrations table for custom events, workshops, camps, etc.
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('workshop', 'camp', 'tournament', 'seminar', 'day_pass', 'private_session', 'custom')),
  event_name TEXT NOT NULL,
  event_date DATE,
  event_time TIME,
  venue TEXT,
  
  -- Participant info (can be linked to member or standalone)
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  participant_phone TEXT NOT NULL,
  participant_email TEXT,
  age_group TEXT CHECK (age_group IN ('kids', 'youth', 'adults', 'seniors', 'all_ages')),
  
  -- Pricing
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  payment_method payment_method NOT NULL,
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  
  -- Capacity tracking
  max_capacity INTEGER CHECK (max_capacity > 0),
  current_registrations INTEGER DEFAULT 1 CHECK (current_registrations > 0),
  
  -- Metadata
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all registrations
CREATE POLICY "Admins manage event registrations"
ON event_registrations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Receptionists can view and insert
CREATE POLICY "Receptionists can view event registrations"
ON event_registrations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'::app_role));

CREATE POLICY "Receptionists can insert event registrations"
ON event_registrations FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'receptionist'::app_role));

-- Accounts can view
CREATE POLICY "Accounts can view event registrations"
ON event_registrations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'accounts'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_event_registrations_event_type ON event_registrations(event_type);
CREATE INDEX idx_event_registrations_event_date ON event_registrations(event_date DESC);
CREATE INDEX idx_event_registrations_member_id ON event_registrations(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_event_registrations_created_at ON event_registrations(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_event_registrations_updated_at
BEFORE UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();