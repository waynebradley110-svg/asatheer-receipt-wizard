-- Update existing 'other' records to 'football_court' in all tables
UPDATE member_services SET zone = 'football_court'::zone_type WHERE zone = 'other';
UPDATE payment_receipts SET zone = 'football_court'::zone_type WHERE zone = 'other';
UPDATE attendance SET zone = 'football_court'::zone_type WHERE zone = 'other';