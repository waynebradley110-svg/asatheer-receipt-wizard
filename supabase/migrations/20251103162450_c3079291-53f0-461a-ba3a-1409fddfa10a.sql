-- Create massage_sales table
CREATE TABLE public.massage_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text NOT NULL,
  amount numeric NOT NULL,
  cash_amount numeric NOT NULL DEFAULT 0,
  card_amount numeric NOT NULL DEFAULT 0,
  cashier_name text,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.massage_sales ENABLE ROW LEVEL SECURITY;

-- Allow all staff to insert
CREATE POLICY "Staff can insert massage sales"
ON public.massage_sales 
FOR INSERT 
WITH CHECK (true);

-- Allow all staff to view
CREATE POLICY "All staff can view massage sales"
ON public.massage_sales 
FOR SELECT 
USING (true);

-- Only admins can modify
CREATE POLICY "Only admins can modify massage sales"
ON public.massage_sales 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Only admins can delete massage sales"
ON public.massage_sales 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));