
-- 1. Members: Remove anon access that exposes all PII
DROP POLICY IF EXISTS "Public can view member by member_id" ON members;

-- Add receptionist insert/update for member registration
CREATE POLICY "Receptionists can insert members"
ON members FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'receptionist'::app_role));

CREATE POLICY "Receptionists can update members"
ON members FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'receptionist'::app_role));

-- 2. Member services: Remove anon access
DROP POLICY IF EXISTS "Public can view member services" ON member_services;

-- Add receptionist insert/update for service management
CREATE POLICY "Receptionists can insert services"
ON member_services FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'receptionist'::app_role));

CREATE POLICY "Receptionists can update services"
ON member_services FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'receptionist'::app_role));

-- 3. Attendance: Remove anon access
DROP POLICY IF EXISTS "Public can view attendance" ON attendance;

-- 4. Deleted members log: Restrict INSERT to admins/receptionists
DROP POLICY IF EXISTS "System can log deletions" ON deleted_members_log;

CREATE POLICY "Admins and receptionists can log deletions"
ON deleted_members_log FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'receptionist'::app_role)
);

-- 5. Financial audit trail: Restrict INSERT
DROP POLICY IF EXISTS "System can insert audit entries" ON financial_audit_trail;

CREATE POLICY "Authorized roles can insert audit entries"
ON financial_audit_trail FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'receptionist'::app_role) OR
  has_role(auth.uid(), 'accounts'::app_role)
);

-- 6. Notification templates: Restrict to admin/receptionist
DROP POLICY IF EXISTS "Allow authenticated users to manage templates" ON notification_templates;

CREATE POLICY "Admins can manage templates"
ON notification_templates FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Receptionists can view templates"
ON notification_templates FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'receptionist'::app_role));

-- 7. Notification settings: Restrict to admin
DROP POLICY IF EXISTS "Allow authenticated users to manage settings" ON notification_settings;

CREATE POLICY "Admins can manage settings"
ON notification_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Receptionists can view settings"
ON notification_settings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'receptionist'::app_role));

CREATE POLICY "Accounts can view settings"
ON notification_settings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'accounts'::app_role));

-- 8. Notification queue: Restrict to admin/receptionist
DROP POLICY IF EXISTS "Allow authenticated users to manage queue" ON notification_queue;

CREATE POLICY "Admins can manage queue"
ON notification_queue FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Receptionists can manage queue"
ON notification_queue FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'receptionist'::app_role))
WITH CHECK (has_role(auth.uid(), 'receptionist'::app_role));

-- 9. Notifications table: Already has role-based policies but add receptionist insert
CREATE POLICY "Receptionists can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'receptionist'::app_role));
