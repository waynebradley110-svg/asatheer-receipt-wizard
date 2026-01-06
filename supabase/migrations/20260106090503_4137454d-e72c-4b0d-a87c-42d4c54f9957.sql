-- Phase 1: Analytics Snapshots Table
CREATE TABLE public.analytics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  total_members INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  expired_members INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  cash_revenue DECIMAL(12,2) DEFAULT 0,
  card_revenue DECIMAL(12,2) DEFAULT 0,
  cafe_revenue DECIMAL(12,2) DEFAULT 0,
  football_revenue DECIMAL(12,2) DEFAULT 0,
  massage_revenue DECIMAL(12,2) DEFAULT 0,
  pt_revenue DECIMAL(12,2) DEFAULT 0,
  total_attendance INTEGER DEFAULT 0,
  churn_count INTEGER DEFAULT 0,
  retention_rate DECIMAL(5,2) DEFAULT 0,
  peak_hour INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, snapshot_type)
);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read analytics" 
ON public.analytics_snapshots FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert analytics" 
ON public.analytics_snapshots FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Phase 2: Notification Templates Table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- expiry_reminder, birthday, payment_confirmation, welcome, freeze_resume, class_reminder
  subject TEXT,
  message_template TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY['whatsapp'], -- whatsapp, email, sms
  is_active BOOLEAN DEFAULT true,
  trigger_days INTEGER[], -- For expiry reminders: [7, 3, 1, 0] days before expiry
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage templates" 
ON public.notification_templates FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Notification Queue Table
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  recipient TEXT NOT NULL, -- phone number or email
  subject TEXT,
  message TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage queue" 
ON public.notification_queue FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Notification Settings Table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage settings" 
ON public.notification_settings FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Insert default notification settings
INSERT INTO public.notification_settings (setting_key, setting_value, description) VALUES
('expiry_reminder_days', '[7, 3, 1, 0]', 'Days before expiry to send reminders'),
('birthday_enabled', 'true', 'Enable birthday notifications'),
('welcome_enabled', 'true', 'Enable welcome messages for new members'),
('payment_confirmation_enabled', 'true', 'Enable payment confirmation messages'),
('notification_hours', '{"start": 9, "end": 21}', 'Hours during which notifications can be sent');

-- Insert default notification templates
INSERT INTO public.notification_templates (name, type, message_template, channels, trigger_days) VALUES
('Expiry Reminder 7 Days', 'expiry_reminder', 'مرحباً {{member_name}}، تذكير: اشتراكك في {{service_name}} سينتهي خلال 7 أيام ({{expiry_date}}). جدد الآن للاستمرار في الاستفادة من خدماتنا!', ARRAY['whatsapp'], ARRAY[7]),
('Expiry Reminder 3 Days', 'expiry_reminder', 'مرحباً {{member_name}}، اشتراكك في {{service_name}} سينتهي خلال 3 أيام ({{expiry_date}}). لا تفوت فرصة التجديد!', ARRAY['whatsapp'], ARRAY[3]),
('Expiry Reminder 1 Day', 'expiry_reminder', '⚠️ مرحباً {{member_name}}، اشتراكك في {{service_name}} سينتهي غداً ({{expiry_date}}). جدد الآن!', ARRAY['whatsapp'], ARRAY[1]),
('Expiry Today', 'expiry_reminder', '🔴 مرحباً {{member_name}}، اشتراكك في {{service_name}} ينتهي اليوم! تواصل معنا للتجديد.', ARRAY['whatsapp'], ARRAY[0]),
('Birthday Wishes', 'birthday', '🎂 عيد ميلاد سعيد {{member_name}}! نتمنى لك يوماً رائعاً. استمتع بخصم 10% على تجديد اشتراكك!', ARRAY['whatsapp'], NULL),
('Welcome Message', 'welcome', 'مرحباً بك {{member_name}} في أكاديمية الأساطير الرياضية! 🏋️ نحن سعداء بانضمامك إلينا. لأي استفسار تواصل معنا.', ARRAY['whatsapp'], NULL),
('Payment Confirmation', 'payment_confirmation', '✅ تم استلام دفعتك بنجاح {{member_name}}! المبلغ: {{amount}} - {{service_name}}. شكراً لك!', ARRAY['whatsapp'], NULL),
('Freeze Resume', 'freeze_resume', 'مرحباً {{member_name}}، تم إلغاء تجميد اشتراكك في {{service_name}}. موعد الانتهاء الجديد: {{new_expiry_date}}. مرحباً بك مجدداً!', ARRAY['whatsapp'], NULL);

-- Create index for faster queries
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status, scheduled_at);
CREATE INDEX idx_notification_queue_member ON public.notification_queue(member_id);
CREATE INDEX idx_analytics_snapshots_date ON public.analytics_snapshots(snapshot_date, snapshot_type);