-- Create cafe_sales table for daily cafe transactions
CREATE TABLE IF NOT EXISTS public.cafe_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
  cashier_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT
);

-- Enable RLS on cafe_sales
ALTER TABLE public.cafe_sales ENABLE ROW LEVEL SECURITY;

-- Create policy for cafe_sales
CREATE POLICY "Allow all operations for authenticated users" 
ON public.cafe_sales 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add coach_name column to member_services for PT tracking
ALTER TABLE public.member_services 
ADD COLUMN IF NOT EXISTS coach_name TEXT;

-- Add notes column to member_services for additional information
ALTER TABLE public.member_services 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cafe_sales_date ON public.cafe_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone_number);
CREATE INDEX IF NOT EXISTS idx_members_barcode ON public.members(barcode);