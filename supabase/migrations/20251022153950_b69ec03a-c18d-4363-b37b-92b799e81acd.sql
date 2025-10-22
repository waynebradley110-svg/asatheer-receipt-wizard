-- Add new zone types to the enum (these must be committed before use)
DO $$ 
BEGIN
  -- Add football_court if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
                 JOIN pg_enum e ON t.oid = e.enumtypid 
                 WHERE t.typname = 'zone_type' AND e.enumlabel = 'football_court') THEN
    ALTER TYPE zone_type ADD VALUE 'football_court';
  END IF;
  
  -- Add paddle_court if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
                 JOIN pg_enum e ON t.oid = e.enumtypid 
                 WHERE t.typname = 'zone_type' AND e.enumlabel = 'paddle_court') THEN
    ALTER TYPE zone_type ADD VALUE 'paddle_court';
  END IF;
END $$;