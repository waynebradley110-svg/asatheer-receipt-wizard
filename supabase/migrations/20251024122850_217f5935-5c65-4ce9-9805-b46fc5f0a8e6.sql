-- Rename basketball zone to football_student
ALTER TYPE zone_type RENAME VALUE 'basketball' TO 'football_student';

-- This will automatically update all existing records in:
-- - member_services table
-- - payment_receipts table
-- - attendance table
-- No data will be lost, all "basketball" entries become "football_student"