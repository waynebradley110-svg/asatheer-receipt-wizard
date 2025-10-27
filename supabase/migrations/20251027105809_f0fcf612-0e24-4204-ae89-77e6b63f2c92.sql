-- Fix cafe_sales payment_method constraint to allow 'mixed' payments
ALTER TABLE cafe_sales DROP CONSTRAINT IF EXISTS cafe_sales_payment_method_check;

ALTER TABLE cafe_sales ADD CONSTRAINT cafe_sales_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'mixed'));