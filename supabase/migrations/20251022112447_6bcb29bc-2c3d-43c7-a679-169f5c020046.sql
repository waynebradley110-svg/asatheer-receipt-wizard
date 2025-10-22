-- Create enum types
CREATE TYPE public.gender_type AS ENUM ('male', 'female');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'online');
CREATE TYPE public.zone_type AS ENUM ('gym', 'crossfit', 'football', 'basketball', 'swimming', 'other');
CREATE TYPE public.subscription_plan AS ENUM ('1_day', '1_month', '3_months', '6_months', '1_year');

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  gender gender_type NOT NULL,
  phone_number TEXT NOT NULL,
  date_of_birth DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Member services table (tracks active subscriptions)
CREATE TABLE public.member_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  subscription_plan subscription_plan NOT NULL,
  zone zone_type NOT NULL,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment receipts table
CREATE TABLE public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  subscription_plan subscription_plan NOT NULL,
  zone zone_type NOT NULL,
  receipt_pdf_url TEXT,
  cashier_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp receipt logs
CREATE TABLE public.whatsapp_receipt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_sender TEXT DEFAULT '0544765671',
  pdf_url TEXT,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deleted members log (backup)
CREATE TABLE public.deleted_members_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_member_id UUID NOT NULL,
  member_data JSONB NOT NULL,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ DEFAULT now()
);

-- Financial audit trail
CREATE TABLE public.financial_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_by TEXT NOT NULL,
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_receipt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_members_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing authenticated users to manage data)
CREATE POLICY "Allow all operations for authenticated users" ON public.members
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all operations for authenticated users" ON public.member_services
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all operations for authenticated users" ON public.payment_receipts
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all operations for authenticated users" ON public.whatsapp_receipt_logs
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all operations for authenticated users" ON public.deleted_members_log
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all operations for authenticated users" ON public.financial_audit_trail
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all operations for authenticated users" ON public.notifications
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for members table
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_members_member_id ON public.members(member_id);
CREATE INDEX idx_members_phone ON public.members(phone_number);
CREATE INDEX idx_member_services_member_id ON public.member_services(member_id);
CREATE INDEX idx_member_services_expiry ON public.member_services(expiry_date);
CREATE INDEX idx_payment_receipts_member_id ON public.payment_receipts(member_id);
CREATE INDEX idx_payment_receipts_created_at ON public.payment_receipts(created_at);
CREATE INDEX idx_whatsapp_logs_member_id ON public.whatsapp_receipt_logs(member_id);
CREATE INDEX idx_notifications_member_id ON public.notifications(member_id);