-- Create membership_freezes table for tracking freeze/suspend actions
CREATE TABLE public.membership_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES member_services(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('freeze', 'suspend')),
  freeze_start DATE NOT NULL,
  freeze_end DATE, -- NULL for suspensions (manual resume)
  reason TEXT CHECK (reason IN ('travel', 'injury', 'personal', 'medical', 'other', NULL)),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  resumed_at TIMESTAMPTZ,
  resumed_by TEXT
);

-- Add freeze_status column to member_services
ALTER TABLE public.member_services ADD COLUMN freeze_status TEXT DEFAULT NULL 
  CHECK (freeze_status IN ('frozen', 'suspended', NULL));

-- Enable RLS on membership_freezes
ALTER TABLE public.membership_freezes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for membership_freezes
CREATE POLICY "Admins can manage freezes" 
ON public.membership_freezes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Receptionists can view freezes" 
ON public.membership_freezes 
FOR SELECT 
USING (has_role(auth.uid(), 'receptionist'::app_role));

CREATE POLICY "Accounts can view freezes" 
ON public.membership_freezes 
FOR SELECT 
USING (has_role(auth.uid(), 'accounts'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_membership_freezes_member_id ON public.membership_freezes(member_id);
CREATE INDEX idx_membership_freezes_service_id ON public.membership_freezes(service_id);
CREATE INDEX idx_membership_freezes_status ON public.membership_freezes(status);