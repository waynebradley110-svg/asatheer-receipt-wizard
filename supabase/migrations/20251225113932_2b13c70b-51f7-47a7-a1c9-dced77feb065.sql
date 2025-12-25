-- Fix notifications: Restrict access to role-based instead of all staff
DROP POLICY IF EXISTS "Staff can view all notifications" ON notifications;

CREATE POLICY "Admins can view all notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can view notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Accounts can view notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'accounts'));

-- Fix cafe_sales: Restrict to admin and accounts only
DROP POLICY IF EXISTS "All staff can view cafe sales" ON cafe_sales;

CREATE POLICY "Admins can view cafe sales" 
ON cafe_sales FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Accounts can view cafe sales" 
ON cafe_sales FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'accounts'));

-- Fix financial_audit_trail: Restrict to admin only
DROP POLICY IF EXISTS "All staff can view audit trail" ON financial_audit_trail;

CREATE POLICY "Only admins can view audit trail" 
ON financial_audit_trail FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

-- Fix massage_sales: Restrict to admin and accounts only
DROP POLICY IF EXISTS "All staff can view massage sales" ON massage_sales;

CREATE POLICY "Admins can view massage sales" 
ON massage_sales FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Accounts can view massage sales" 
ON massage_sales FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'accounts'));

-- Fix football_sales: Restrict to admin and accounts only
DROP POLICY IF EXISTS "All staff can view football sales" ON football_sales;

CREATE POLICY "Admins can view football sales" 
ON football_sales FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Accounts can view football sales" 
ON football_sales FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'accounts'));

-- Fix coaches: Restrict SELECT to role-based
DROP POLICY IF EXISTS "All staff can view coaches" ON coaches;

CREATE POLICY "Admins can view coaches" 
ON coaches FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can view coaches" 
ON coaches FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Accounts can view coaches" 
ON coaches FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'accounts'));