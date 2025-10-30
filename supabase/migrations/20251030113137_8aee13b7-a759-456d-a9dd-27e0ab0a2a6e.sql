-- Phase 1: Critical Security Fixes
-- Fix overly permissive RLS policies across all tables

-- ============================================================================
-- 1. MEMBERS TABLE: Restrict modifications to admins only
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON members;

CREATE POLICY "Admins can manage members" 
ON members FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can view members" 
ON members FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Accounts can view members" 
ON members FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'accounts'));

-- ============================================================================
-- 2. PAYMENT_RECEIPTS: Admins manage, others view only
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON payment_receipts;

CREATE POLICY "Admins manage receipts" 
ON payment_receipts FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can view receipts" 
ON payment_receipts FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Accounts can view receipts" 
ON payment_receipts FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'accounts'));

-- ============================================================================
-- 3. EXPENSES: Admins and accounts can manage
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expenses;

CREATE POLICY "Admins manage expenses" 
ON expenses FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accounts manage expenses" 
ON expenses FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'accounts'));

-- ============================================================================
-- 4. CAFE_SALES: Staff can insert, all view, only admins modify/delete
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON cafe_sales;

CREATE POLICY "Staff can insert cafe sales" 
ON cafe_sales FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All staff can view cafe sales" 
ON cafe_sales FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only admins can modify cafe sales" 
ON cafe_sales FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete cafe sales" 
ON cafe_sales FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. FOOTBALL_SALES: Same as cafe_sales
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON football_sales;

CREATE POLICY "Staff can insert football sales" 
ON football_sales FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All staff can view football sales" 
ON football_sales FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only admins can modify football sales" 
ON football_sales FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete football sales" 
ON football_sales FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 6. FINANCIAL_AUDIT_TRAIL: Read-only for all, no direct user writes
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON financial_audit_trail;

CREATE POLICY "All staff can view audit trail" 
ON financial_audit_trail FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "System can insert audit entries" 
ON financial_audit_trail FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- ============================================================================
-- 7. WHATSAPP_RECEIPT_LOGS: Admin-only access
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON whatsapp_receipt_logs;

CREATE POLICY "Only admins can manage WhatsApp logs" 
ON whatsapp_receipt_logs FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 8. DELETED_MEMBERS_LOG: Admin view, system insert
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON deleted_members_log;

CREATE POLICY "Only admins can view deleted member logs" 
ON deleted_members_log FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can log deletions" 
ON deleted_members_log FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- ============================================================================
-- 9. NOTIFICATIONS: Members see own, admins see all
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON notifications;

CREATE POLICY "Staff can view all notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins manage notifications" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete notifications" 
ON notifications FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 10. ATTENDANCE: Receptionists and admins manage, others view
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON attendance;

CREATE POLICY "Receptionists manage attendance" 
ON attendance FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'receptionist') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accounts can view attendance" 
ON attendance FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'accounts'));

-- ============================================================================
-- 11. MEMBER_SERVICES: Admins manage, others view
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON member_services;

CREATE POLICY "Admins manage services" 
ON member_services FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Receptionists can view services" 
ON member_services FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Accounts can view services" 
ON member_services FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'accounts'));