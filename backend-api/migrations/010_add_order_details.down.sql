-- Revert Migration 010
ALTER TABLE orders
DROP COLUMN IF NOT EXISTS order_number,
DROP COLUMN IF NOT EXISTS items;
