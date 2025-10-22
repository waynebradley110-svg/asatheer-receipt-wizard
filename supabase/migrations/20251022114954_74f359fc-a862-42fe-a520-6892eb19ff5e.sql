-- Add new values to existing enums
ALTER TYPE public.zone_type ADD VALUE IF NOT EXISTS 'ladies_gym';
ALTER TYPE public.zone_type ADD VALUE IF NOT EXISTS 'pt';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS '2_months';

-- Create expense_category enum
CREATE TYPE public.expense_category AS ENUM ('business', 'owner');

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for expenses
CREATE POLICY "Allow all operations for authenticated users" ON public.expenses
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create trigger for expenses table
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at);