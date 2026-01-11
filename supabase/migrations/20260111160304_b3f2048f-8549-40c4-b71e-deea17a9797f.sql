-- Clean up existing duplicate/expired active services

-- First, deactivate all services that have expired
UPDATE public.member_services 
SET is_active = false 
WHERE expiry_date < CURRENT_DATE 
AND is_active = true;

-- For members with multiple active services in same zone,
-- keep only the one with latest expiry date
WITH ranked_services AS (
  SELECT id, member_id, zone, expiry_date,
    ROW_NUMBER() OVER (PARTITION BY member_id, zone ORDER BY expiry_date DESC) as rn
  FROM public.member_services
  WHERE is_active = true
)
UPDATE public.member_services
SET is_active = false
WHERE id IN (
  SELECT id FROM ranked_services WHERE rn > 1
);