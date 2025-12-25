-- Fix cafe_sales: Restrict INSERT to admin/receptionist only
DROP POLICY IF EXISTS "Staff can insert cafe sales" ON cafe_sales;

CREATE POLICY "Admins can insert cafe sales" 
ON cafe_sales FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can insert cafe sales" 
ON cafe_sales FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'receptionist'));

-- Fix massage_sales: Restrict INSERT to admin/receptionist only
DROP POLICY IF EXISTS "Staff can insert massage sales" ON massage_sales;

CREATE POLICY "Admins can insert massage sales" 
ON massage_sales FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can insert massage sales" 
ON massage_sales FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'receptionist'));

-- Fix football_sales: Restrict INSERT to admin/receptionist only
DROP POLICY IF EXISTS "Staff can insert football sales" ON football_sales;

CREATE POLICY "Admins can insert football sales" 
ON football_sales FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can insert football sales" 
ON football_sales FOR INSERT 
TO authenticated 
WITH CHECK (has_role(auth.uid(), 'receptionist'));

-- Move pg_trgm extension from public to extensions schema (if it exists)
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;