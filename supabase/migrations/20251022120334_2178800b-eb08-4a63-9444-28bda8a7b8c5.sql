-- Add transaction_id to payment_receipts table to group split payments
ALTER TABLE public.payment_receipts 
ADD COLUMN transaction_id uuid DEFAULT gen_random_uuid();

-- Add index for faster queries on transaction_id
CREATE INDEX idx_payment_receipts_transaction_id ON public.payment_receipts(transaction_id);

-- Add comment for documentation
COMMENT ON COLUMN public.payment_receipts.transaction_id IS 'Groups multiple payment methods for a single transaction (e.g., split payments: cash + card)';