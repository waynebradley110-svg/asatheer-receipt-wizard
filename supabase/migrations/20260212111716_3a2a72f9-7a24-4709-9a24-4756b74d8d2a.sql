
-- Add VIP flag to members table
ALTER TABLE public.members ADD COLUMN is_vip boolean NOT NULL DEFAULT false;

-- Add a comment for clarity
COMMENT ON COLUMN public.members.is_vip IS 'VIP members (e.g. owner family) - their payments are excluded from financial reports';
