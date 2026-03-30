-- Drop the check constraint that forced it to be between 1 and 999
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_counter_number_check;
-- Migration 009: Alter counter_number to VARCHAR
ALTER TABLE orders ALTER COLUMN counter_number TYPE VARCHAR(50);
-- Set a default value to '1' if omitted at DB level
ALTER TABLE orders ALTER COLUMN counter_number SET DEFAULT '1';
