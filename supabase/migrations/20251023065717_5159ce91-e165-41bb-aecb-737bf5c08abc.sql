-- Add cash and card columns to cafe_sales (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'cafe_sales' AND column_name = 'cash_amount') THEN
    ALTER TABLE public.cafe_sales 
      ADD COLUMN cash_amount NUMERIC DEFAULT 0 CHECK (cash_amount >= 0),
      ADD COLUMN card_amount NUMERIC DEFAULT 0 CHECK (card_amount >= 0);
  END IF;
END $$;

-- Create football_sales table for football court transactions
CREATE TABLE IF NOT EXISTS public.football_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  cash_amount NUMERIC NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
  card_amount NUMERIC NOT NULL DEFAULT 0 CHECK (card_amount >= 0),
  total_amount NUMERIC GENERATED ALWAYS AS (cash_amount + card_amount) STORED,
  cashier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_football_sales_date ON public.football_sales(sale_date);

-- Enable RLS
ALTER TABLE public.football_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (drop first if exists to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.football_sales;
CREATE POLICY "Allow all operations for authenticated users" 
  ON public.football_sales
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE public.football_sales IS 'Records daily football court rental and sales transactions';